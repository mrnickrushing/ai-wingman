import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import {
  AudioModule,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  RecordingPresets,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
  type RecordingOptions,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { checkWingmanServerHealth, wingmanClient } from '../services/wingmanClient';
import { getAuthToken } from '../services/auth';
import { useSessionStore } from '../store/sessionStore';
import { TranscriptEntry, CoachingEntry } from '../types';

let idCounter = 0;
const nextId = () => String(++idCounter);

const COACHING_VISIBLE_MS = 6000;

// dBFS threshold below which we treat the chunk as silence and skip it.
// Typical quiet room: -60 to -50 dBFS. AirPods and some iPhone mics report
// speech slightly lower than the built-in mic, so keep this forgiving.
const SILENCE_THRESHOLD_DBFS = -55;

type RecorderConstructorOptions = ConstructorParameters<typeof AudioModule.AudioRecorder>[0];

type RecorderProfile = {
  label: string;
  options: RecordingOptions;
  nativeOptions: RecorderConstructorOptions;
  mimeType: string;
};

const withMetering = (options: RecordingOptions, overrides?: Partial<RecordingOptions>): RecordingOptions => ({
  ...options,
  ...overrides,
  isMeteringEnabled: true,
  android: {
    ...options.android,
    ...overrides?.android,
    audioSource: 'voice_communication',
  },
  ios: {
    ...options.ios,
    ...overrides?.ios,
  },
  web: {
    ...options.web,
    ...overrides?.web,
  },
});

const toNativeRecordingOptions = (options: RecordingOptions): RecorderConstructorOptions => {
  const common = {
    extension: options.extension,
    sampleRate: options.sampleRate,
    numberOfChannels: options.numberOfChannels,
    bitRate: options.bitRate,
    isMeteringEnabled: options.isMeteringEnabled ?? false,
    directory: options.directory,
  };
  if (Platform.OS === 'ios') {
    return { ...common, ...options.ios } as unknown as RecorderConstructorOptions;
  }
  if (Platform.OS === 'android') {
    return { ...common, ...options.android } as unknown as RecorderConstructorOptions;
  }
  return { ...common, ...options.web } as unknown as RecorderConstructorOptions;
};

const createProfile = (label: string, options: RecordingOptions, mimeType = 'audio/mp4'): RecorderProfile => ({
  label,
  options,
  nativeOptions: toNativeRecordingOptions(options),
  mimeType,
});

const RECORDER_PROFILES: RecorderProfile[] = [
  createProfile('high-quality-m4a', withMetering(RecordingPresets.HIGH_QUALITY)),
  createProfile('low-quality-m4a', withMetering(RecordingPresets.LOW_QUALITY)),
  createProfile(
    'mono-voice-m4a',
    withMetering(RecordingPresets.HIGH_QUALITY, {
      numberOfChannels: 1,
      bitRate: 64000,
    })
  ),
];

let preferredRecorderProfileIndex = 0;

const describeError = (err: unknown): string =>
  err instanceof Error ? err.message : String(err || 'Unknown error');

const configureRecordingAudioMode = async (resetSession = false) => {
  if (resetSession) {
    await setIsAudioActiveAsync(false).catch(() => {});
  }
  await setAudioModeAsync({
    allowsRecording: true,
    allowsBackgroundRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    shouldRouteThroughEarpiece: false,
  } as Parameters<typeof setAudioModeAsync>[0]);
};

const createPreparedRecorder = async (): Promise<{ recorder: AudioRecorder; profile: RecorderProfile }> => {
  const failures: string[] = [];
  const orderedProfiles = [
    ...RECORDER_PROFILES.slice(preferredRecorderProfileIndex),
    ...RECORDER_PROFILES.slice(0, preferredRecorderProfileIndex),
  ];

  for (const profile of orderedProfiles) {
    let recorder: AudioRecorder | null = null;
    try {
      recorder = new AudioModule.AudioRecorder(profile.nativeOptions);
      await recorder.prepareToRecordAsync();
      preferredRecorderProfileIndex = RECORDER_PROFILES.findIndex((candidate) => candidate.label === profile.label);
      return { recorder, profile };
    } catch (err) {
      failures.push(`${profile.label}: ${describeError(err)}`);
      if (recorder) {
        try { recorder.release(); } catch { /* noop */ }
      }
    }
  }

  throw new Error(`Recorder failed for every profile. ${failures.join(' | ')}`);
};

export type WingmanPreflightResult = {
  ok: boolean;
  server: { ok: boolean; message: string };
  microphone: { ok: boolean; message: string };
  recorder: { ok: boolean; message: string };
  input: { ok: boolean; message: string; peakDb: number | null };
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runWingmanPreflight(sampleMs = 1600): Promise<WingmanPreflightResult> {
  const result: WingmanPreflightResult = {
    ok: false,
    server: { ok: false, message: 'Not checked yet.' },
    microphone: { ok: false, message: 'Not checked yet.' },
    recorder: { ok: false, message: 'Not checked yet.' },
    input: { ok: false, message: 'Not checked yet.', peakDb: null },
  };

  const health = await checkWingmanServerHealth();
  result.server = {
    ok: health.ok,
    message: health.ok ? 'Wingman server is online.' : health.message,
  };
  if (!health.ok) return result;

  try {
    const permissions = await requestRecordingPermissionsAsync();
    const granted = 'granted' in permissions ? permissions.granted : false;
    result.microphone = {
      ok: granted,
      message: granted ? 'Microphone permission is enabled.' : 'Microphone permission is required.',
    };
    if (!granted) return result;
  } catch (err) {
    result.microphone = {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not request microphone permission.',
    };
    return result;
  }

  let recorder: AudioRecorder | null = null;
  let meteringPoll: ReturnType<typeof setInterval> | null = null;
  let peakDb = SILENCE_THRESHOLD_DBFS - 1;
  try {
    await configureRecordingAudioMode(true);

    const prepared = await createPreparedRecorder();
    recorder = prepared.recorder;
    try {
      recorder.record();
    } catch (err) {
      throw new Error(`Recorder prepared but could not start (${prepared.profile.label}): ${describeError(err)}`);
    }
    meteringPoll = setInterval(() => {
      const status = recorder?.getStatus();
      if (status && typeof status.metering === 'number' && status.metering > peakDb) {
        peakDb = status.metering;
      }
    }, 100);

    await wait(sampleMs);
    if (meteringPoll) clearInterval(meteringPoll);
    meteringPoll = null;
    await recorder.stop();
    const uri = recorder.uri;
    const info = uri ? await FileSystem.getInfoAsync(uri).catch(() => null) : null;
    const fileSize = info && info.exists && 'size' in info ? info.size ?? 0 : 0;

    result.recorder = {
      ok: Boolean(uri && fileSize > 512),
      message: uri && fileSize > 512
        ? `Recorder produced an audio sample (${prepared.profile.label}).`
        : 'Recorder did not produce usable audio.',
    };
    result.input = {
      ok: peakDb >= SILENCE_THRESHOLD_DBFS || fileSize > 4096,
      peakDb,
      message: peakDb >= SILENCE_THRESHOLD_DBFS || fileSize > 4096
        ? 'Voice input was detected.'
        : 'No voice level was detected. Speak closer to the mic and try again.',
    };
    if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  } catch (err) {
    result.recorder = {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not record a microphone sample.',
    };
    result.input = {
      ok: false,
      peakDb: Number.isFinite(peakDb) ? peakDb : null,
      message: 'Input could not be measured.',
    };
  } finally {
    if (meteringPoll) clearInterval(meteringPoll);
    if (recorder) {
      try { recorder.release(); } catch { /* noop */ }
    }
  }

  result.ok = result.server.ok && result.microphone.ok && result.recorder.ok && result.input.ok;
  return result;
}

export function useWingmanSession() {
  const recordingRef = useRef<AudioRecorder | null>(null);
  const recordingProfileRef = useRef<RecorderProfile | null>(null);
  // Peak metering (dBFS) tracked during each ~0.9 s recording cycle.
  // Reset when a new recorder starts; checked before sending to skip silence.
  const peakMeteringRef = useRef<number>(SILENCE_THRESHOLD_DBFS - 1);
  const meteringPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against overlapping capture cycles: a slow stop()/file-read can run
  // past the interval, and a second invocation racing the first would
  // orphan a native recorder (leak / double-record crash).
  const capturingRef = useRef(false);
  const connectWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureFailureCountRef = useRef(0);
  const hasReceivedTranscriptRef = useRef(false);

  // Coaching-audio playback queue so overlapping tips play in order, not on top
  // of each other.
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const syncAppState = (state: AppStateStatus) => {
      const store = useSessionStore.getState();
      store.setAppState(
        state === 'active' || state === 'background' || state === 'inactive' || state === 'extension'
          ? state
          : 'unknown'
      );

      if (state !== 'active' && store.isRecording && isActiveRef.current) {
        if (store.backgroundAudioState !== 'watching') {
          store.setBackgroundEnteredAt(Date.now());
          store.setBackgroundAudioState('watching');
        }
        return;
      }

      if (state === 'active' && store.backgroundAudioState === 'watching') {
        const enteredAt = store.backgroundEnteredAt ?? Date.now();
        const observedAt = Math.max(store.lastAudioChunkAt ?? 0, store.lastTranscriptAt ?? 0);
        store.setBackgroundEnteredAt(null);
        store.setBackgroundAudioState(observedAt >= enteredAt ? 'verified' : 'paused');
        if (observedAt < enteredAt && store.isRecording) {
          store.setError('Background audio did not produce a fresh chunk after app switch or lock. Check iOS background audio permission and try again.');
        }
      }
    };

    syncAppState(AppState.currentState as AppStateStatus);
    const subscription = AppState.addEventListener('change', syncAppState);
    return () => subscription.remove();
  }, []);

  const playCoachingAudio = useCallback(async (base64Mp3: string) => {
    audioQueueRef.current.push(base64Mp3);
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    const { setWingmanSpeaking, setError } = useSessionStore.getState();
    while (audioQueueRef.current.length > 0) {
      const b64 = audioQueueRef.current.shift()!;
      const uri = `${FileSystem.cacheDirectory}wm-coach-${nextId()}.mp3`;
      let player: AudioPlayer | null = null;
      try {
        await configureRecordingAudioMode();
        await setIsAudioActiveAsync(true);
        await FileSystem.writeAsStringAsync(uri, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        player = createAudioPlayer({ uri }, {
          updateInterval: 100,
          keepAudioSessionActive: true,
        });
        player.volume = 1.0;
        try {
          player.setActiveForLockScreen(true, {
            title: 'AI Wingman',
            artist: 'Live coaching',
            albumTitle: 'Wingman',
          });
        } catch {
          // Lock screen controls are a best-effort background playback upgrade.
        }
        setWingmanSpeaking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        await new Promise<void>((resolve) => {
          const sub = player!.addListener('playbackStatusUpdate', (status: AudioStatus) => {
            if (status.didJustFinish || status.error) {
              sub.remove();
              resolve();
            }
          });
          player!.play();
        });
      } catch (err) {
        setError(`Coaching audio playback failed. ${describeError(err)}`);
      } finally {
        if (player) {
          try { player.remove(); } catch { /* noop */ }
          try { player.clearLockScreenControls(); } catch { /* noop */ }
        }
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
    }

    setWingmanSpeaking(false);
    isPlayingRef.current = false;
  }, []);

  // Wire up WebSocket events. Actions are read via getState() so this effect
  // never needs to re-subscribe and runs exactly once.
  useEffect(() => {
    const unsubscribe = wingmanClient.on((event) => {
      const store = useSessionStore.getState();

      if (event.type === 'connected') {
        store.setConnected(true);
        store.setReconnecting(false);
        store.setServerHealth('online');
        store.setSessionPhase('ready');
        store.setError(null);
        if (connectWatchdogRef.current) {
          clearTimeout(connectWatchdogRef.current);
          connectWatchdogRef.current = null;
        }
        if (transcriptWatchdogRef.current) {
          clearTimeout(transcriptWatchdogRef.current);
          transcriptWatchdogRef.current = null;
        }
        transcriptWatchdogRef.current = setTimeout(() => {
          const current = useSessionStore.getState();
          if (current.isRecording && current.isConnected && !hasReceivedTranscriptRef.current) {
            current.setError(
              'Connected, but no speech is reaching the server yet. Check microphone permission and input level.'
            );
          }
        }, 12000);
      } else if (event.type === 'reconnecting') {
        store.setConnected(false);
        store.setReconnecting(true);
        store.setSessionPhase('connecting');
      } else if (event.type === 'disconnected') {
        store.setConnected(false);
        if (!isActiveRef.current) {
          store.setSessionPhase('idle');
        }
      } else if (event.type === 'error') {
        store.setSessionPhase('error');
        store.setError(event.message);
      } else if (event.type === 'session_started') {
        store.setSessionId(event.sessionId);
      } else if (event.type === 'transcript') {
        hasReceivedTranscriptRef.current = true;
        store.setLastTranscriptAt(Date.now());
        store.setSessionPhase('streaming');
        if (transcriptWatchdogRef.current) {
          clearTimeout(transcriptWatchdogRef.current);
          transcriptWatchdogRef.current = null;
        }
        const entry: TranscriptEntry = {
          id: nextId(),
          text: event.text,
          isFinal: event.isFinal,
          timestamp: Date.now(),
        };
        store.upsertTranscript(entry);
        if (event.isFinal) {
          store.incrementWords(event.text.split(/\s+/).filter(Boolean).length);
        }
      } else if (event.type === 'coaching') {
        store.setSessionPhase('coaching');
        const entry: CoachingEntry = {
          id: nextId(),
          text: event.text,
          timestamp: Date.now(),
        };
        store.addCoaching(entry);
        store.setCurrentCoaching(event.text);
        // Tactile nudge so the user knows to listen — they can't watch the screen.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        // Reset the auto-dismiss timer each time a new tip arrives so a previous
        // timer can't clear a fresh tip early.
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(
          () => useSessionStore.getState().setCurrentCoaching(null),
          COACHING_VISIBLE_MS
        );
      } else if (event.type === 'coaching_audio') {
        void playCoachingAudio(event.audio);
      } else if (event.type === 'session_ended') {
        store.setSessionId(null);
        if (!isActiveRef.current) {
          store.setSessionPhase('idle');
        }
      }
    });

    return unsubscribe;
  }, [playCoachingAudio]);

  const startChunkRecording = useCallback(async () => {
    try {
      const permissions = await requestRecordingPermissionsAsync();
      useSessionStore.getState().setMicPermissionGranted('granted' in permissions ? permissions.granted : null);
      if ('granted' in permissions && !permissions.granted) {
        throw new Error('Microphone permission is required for live coaching.');
      }
    } catch (err) {
      useSessionStore.getState().setMicPermissionGranted(false);
      throw err instanceof Error ? err : new Error('Microphone permission is required for live coaching.');
    }

    try {
      await configureRecordingAudioMode(true);
    } catch {
      // audio mode config failed — recording may still work
    }

    const captureAndSend = async () => {
      if (!isActiveRef.current) return;
      // Skip this tick if the previous cycle is still finishing — prevents
      // overlapping recorders.
      if (capturingRef.current) return;
      capturingRef.current = true;
      try {
        await runCaptureCycle();
      } finally {
        capturingRef.current = false;
      }
    };

    const runCaptureCycle = async () => {
      // Stop the current segment and ship it as a complete container file.
      if (recordingRef.current) {
        const recorder = recordingRef.current;
        recordingRef.current = null;
        // Stop the metering poll before stopping.
        if (meteringPollRef.current) {
          clearInterval(meteringPollRef.current);
          meteringPollRef.current = null;
        }
        const peakDb = peakMeteringRef.current;
        try {
          await recorder.stop();
          // Gate on amplitude: skip chunks that were below the speech threshold.
          if (peakDb >= SILENCE_THRESHOLD_DBFS) {
            const uri = recorder.uri;
            if (uri) {
              const b64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              useSessionStore.getState().setLastAudioChunkAt(Date.now());
              wingmanClient.sendAudioChunk(b64, recordingProfileRef.current?.mimeType ?? 'audio/mp4');
              captureFailureCountRef.current = 0;
              await FileSystem.deleteAsync(uri, { idempotent: true });
            } else {
              captureFailureCountRef.current += 1;
            }
          }
        } catch {
          // ignore errors during capture cycle
          captureFailureCountRef.current += 1;
        } finally {
          try { recorder.release(); } catch { /* noop */ }
        }

        if (captureFailureCountRef.current >= 3) {
          useSessionStore.getState().setSessionPhase('error');
          useSessionStore.getState().setError(
            'Microphone capture is not producing usable audio. Check permissions and try again.'
          );
        }
      }

      if (!isActiveRef.current) return;

      // Start a new recording segment. We record a complete AAC/m4a container
      // each cycle (reliable on both iOS and Android); Deepgram auto-detects
      // the codec server-side.
      //
      // NOISE SUPPRESSION / ECHO CANCELLATION: expo-audio's RecordingOptions does
      // NOT expose noise suppression, echo cancellation, or AGC — its API
      // surface (extension/outputFormat/encoder/sampleRate/channels/bitRate)
      // has no field for them, and it does not wire up the platform voice-comm
      // audio sources (Android VOICE_COMMUNICATION / iOS AVAudioSession
      // .voiceChat mode) that enable the OS DSP. We instead lean on Deepgram's
      // server-side denoising (see server/src/services/deepgram.ts). FLAGGED
      // FOR A FUTURE NATIVE MODULE: to get on-device suppression we'd need a
      // custom native recorder (e.g. AudioRecord with VOICE_COMMUNICATION +
      // NoiseSuppressor/AcousticEchoCanceler on Android, and an AVAudioSession
      // configured for voice chat on iOS).
      let recording: AudioRecorder | null = null;
      try {
        const prepared = await createPreparedRecorder();
        recording = prepared.recorder;
        recordingProfileRef.current = prepared.profile;
        // Reset peak and poll metering for this cycle.
        peakMeteringRef.current = SILENCE_THRESHOLD_DBFS - 1;
        if (meteringPollRef.current) clearInterval(meteringPollRef.current);
        meteringPollRef.current = setInterval(() => {
          const status = recording?.getStatus();
          if (status && typeof status.metering === 'number' && status.metering > peakMeteringRef.current) {
            peakMeteringRef.current = status.metering;
            useSessionStore.getState().setMicLevelDb(status.metering);
          }
        }, 100);
        recording.record();
        recordingRef.current = recording;
        captureFailureCountRef.current = 0;
        useSessionStore.getState().setSessionPhase('recording');
        return true;
      } catch (err) {
        if (recording) {
          try { recording.release(); } catch { /* noop */ }
        }
        recordingRef.current = null;
        useSessionStore.getState().setError(`Could not start microphone capture. ${describeError(err)}`);
        return false;
      }
    };

    // First segment immediately
    await captureAndSend();
    // Then every ~0.9s so live transcription sees smaller chunks sooner.
    chunkTimerRef.current = setInterval(captureAndSend, 900);
    return Boolean(recordingRef.current);
  }, []);

  const start = useCallback(async (config = useSessionStore.getState().getSessionConfig()) => {
    const store = useSessionStore.getState();
    try {
      store.reset();
      store.setAppState(AppState.currentState as AppStateStatus);
      store.setBackgroundAudioState('idle');
      store.setBackgroundEnteredAt(null);
      captureFailureCountRef.current = 0;
      hasReceivedTranscriptRef.current = false;
      isActiveRef.current = true;
      store.setLastSessionStartedAt(Date.now());
      store.setSessionPhase('checking_server');
      store.setServerHealth('checking');

      const health = await checkWingmanServerHealth();
      store.setServerHealth(health.ok ? 'online' : 'offline');
      if (!health.ok) {
        store.setSessionPhase('error');
        store.setError(`Wingman server unavailable: ${health.message}`);
        wingmanClient.disconnect();
        isActiveRef.current = false;
        store.setRecording(false);
        return;
      }

      store.setSessionPhase('connecting');
      const authToken = await getAuthToken().catch(() => null);
      wingmanClient.connect(config, authToken);
      if (connectWatchdogRef.current) clearTimeout(connectWatchdogRef.current);
      connectWatchdogRef.current = setTimeout(() => {
        const current = useSessionStore.getState();
        if (!current.isConnected && isActiveRef.current) {
          current.setSessionPhase('error');
          current.setError('Could not connect to the Wingman server. Check your network and server URL.');
        }
      }, 10000);

      // Elapsed time clock
      clockRef.current = setInterval(() => useSessionStore.getState().incrementElapsed(), 1000);

      const started = await startChunkRecording().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not start microphone capture.';
        useSessionStore.getState().setError(message);
        useSessionStore.getState().setSessionPhase('error');
        return false;
      });
      useSessionStore.getState().setRecording(started);
      if (!started) {
        wingmanClient.disconnect();
        isActiveRef.current = false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start session.';
      store.setError(message);
      store.setSessionPhase('error');
      wingmanClient.disconnect();
      isActiveRef.current = false;
      store.setRecording(false);
    }
  }, [startChunkRecording]);

  const stop = useCallback(async () => {
    isActiveRef.current = false;
    capturingRef.current = false;

    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (clockRef.current) {
      clearInterval(clockRef.current);
      clockRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (connectWatchdogRef.current) {
      clearTimeout(connectWatchdogRef.current);
      connectWatchdogRef.current = null;
    }
    if (transcriptWatchdogRef.current) {
      clearTimeout(transcriptWatchdogRef.current);
      transcriptWatchdogRef.current = null;
    }

    if (meteringPollRef.current) {
      clearInterval(meteringPollRef.current);
      meteringPollRef.current = null;
    }

    if (recordingRef.current) {
      const recorder = recordingRef.current;
      recordingRef.current = null;
      try {
        await recorder.stop();
      } catch {
        // already stopped
      }
      try { recorder.release(); } catch { /* noop */ }
    }
    useSessionStore.getState().setMicLevelDb(null);
    useSessionStore.getState().setBackgroundEnteredAt(null);
    useSessionStore.getState().setBackgroundAudioState('idle');

    audioQueueRef.current = [];

    wingmanClient.endSession();
    await new Promise((resolve) => setTimeout(resolve, 900));
    wingmanClient.disconnect();
    const store = useSessionStore.getState();
    store.setRecording(false);
    store.setWingmanSpeaking(false);
    store.setSessionPhase('idle');
  }, []);

  return { start, stop };
}
