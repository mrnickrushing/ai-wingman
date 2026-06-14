import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  AudioModule,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  AudioQuality,
  IOSOutputFormat,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { wingmanClient } from '../services/wingmanClient';
import { useSessionStore } from '../store/sessionStore';
import { TranscriptEntry, CoachingEntry } from '../types';

let idCounter = 0;
const nextId = () => String(++idCounter);

const COACHING_VISIBLE_MS = 6000;

// We record a complete AAC/m4a container each cycle (reliable on both iOS and
// Android); Deepgram auto-detects the codec server-side.
//
// The native `AudioModule.AudioRecorder` constructor expects a FLATTENED
// options object (common fields + the active platform's fields spread at the
// top level) — the same shape expo-audio's own `createRecordingOptions` helper
// produces inside `useAudioRecorder`. Passing the cross-platform nested shape
// (with `ios`/`android`/`web` sub-objects) leaves the native recorder without
// an `outputFormat`/`audioQuality`, which makes `prepareToRecordAsync()` throw
// on iOS. We resolve the platform options here, once, at module load.
// dBFS threshold below which we treat the chunk as silence and skip it.
// Typical quiet room: -60 to -50 dBFS. Speech starts around -40 dBFS.
const SILENCE_THRESHOLD_DBFS = -45;

const COMMON_RECORDING_OPTIONS = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
};

// Typed as the AudioRecorder constructor's first parameter. The public
// `RecordingOptions` type describes the cross-platform NESTED shape, but the
// native constructor consumes the FLATTENED shape (what `createRecordingOptions`
// emits), so we resolve to that type here.
type RecorderConstructorOptions = ConstructorParameters<typeof AudioModule.AudioRecorder>[0];

const CHUNK_RECORDING_OPTIONS: RecorderConstructorOptions =
  Platform.OS === 'ios'
    ? {
        ...COMMON_RECORDING_OPTIONS,
        outputFormat: IOSOutputFormat.MPEG4AAC,
        audioQuality: AudioQuality.MEDIUM,
      }
    : Platform.OS === 'android'
      ? {
          ...COMMON_RECORDING_OPTIONS,
          outputFormat: 'mpeg4',
          audioEncoder: 'aac',
        }
      : {
          ...COMMON_RECORDING_OPTIONS,
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        };

export function useWingmanSession() {
  const recordingRef = useRef<AudioRecorder | null>(null);
  // Peak metering (dBFS) tracked during each 1.5 s recording cycle.
  // Reset when a new recorder starts; checked before sending to skip silence.
  const peakMeteringRef = useRef<number>(SILENCE_THRESHOLD_DBFS - 1);
  const meteringSubRef = useRef<{ remove: () => void } | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against overlapping capture cycles: a slow stop()/file-read can run
  // past the 1.5s interval, and a second invocation racing the first would
  // orphan a native recorder (leak / double-record crash).
  const capturingRef = useRef(false);

  // Coaching-audio playback queue so overlapping tips play in order, not on top
  // of each other.
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const playCoachingAudio = useCallback(async (base64Mp3: string) => {
    audioQueueRef.current.push(base64Mp3);
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    const { setWingmanSpeaking } = useSessionStore.getState();
    while (audioQueueRef.current.length > 0) {
      const b64 = audioQueueRef.current.shift()!;
      const uri = `${FileSystem.cacheDirectory}wm-coach-${nextId()}.mp3`;
      let player: AudioPlayer | null = null;
      try {
        await FileSystem.writeAsStringAsync(uri, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        player = createAudioPlayer({ uri }, { updateInterval: 100 });
        player.volume = 1.0;
        setWingmanSpeaking(true);
        await new Promise<void>((resolve) => {
          const sub = player!.addListener('playbackStatusUpdate', (status: AudioStatus) => {
            if (status.didJustFinish || status.error) {
              sub.remove();
              resolve();
            }
          });
          player!.play();
        });
      } catch {
        // ignore playback errors — text coaching is still shown on screen
      } finally {
        if (player) {
          try { player.remove(); } catch { /* noop */ }
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
        store.setError(null);
      } else if (event.type === 'reconnecting') {
        store.setConnected(false);
        store.setReconnecting(true);
      } else if (event.type === 'disconnected') {
        store.setConnected(false);
      } else if (event.type === 'error') {
        store.setError(event.message);
      } else if (event.type === 'session_started') {
        store.setSessionId(event.sessionId);
      } else if (event.type === 'transcript') {
        if (event.isFinal) {
          const entry: TranscriptEntry = {
            id: nextId(),
            text: event.text,
            isFinal: true,
            timestamp: Date.now(),
          };
          store.addTranscript(entry);
          store.incrementWords(event.text.split(/\s+/).filter(Boolean).length);
        } else {
          store.updateLastTranscript(event.text);
        }
      } else if (event.type === 'coaching') {
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
      }
    });

    return unsubscribe;
  }, [playCoachingAudio]);

  const startChunkRecording = useCallback(async () => {
    try {
      await requestRecordingPermissionsAsync();
    } catch {
      // permission request threw — proceed; recorder calls below are guarded
    }
    try {
      // allowsBluetoothA2DP routes coaching audio to AirPods/BT headphones when connected (iOS).
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        ...(Platform.OS === 'ios' ? { allowsBluetoothA2DP: true } : {}),
      } as Parameters<typeof setAudioModeAsync>[0]);
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
        // Detach the metering listener before stopping.
        meteringSubRef.current?.remove();
        meteringSubRef.current = null;
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
              wingmanClient.sendAudioChunk(b64, 'audio/mp4');
              await FileSystem.deleteAsync(uri, { idempotent: true });
            }
          }
        } catch {
          // ignore errors during capture cycle
        } finally {
          try { recorder.release(); } catch { /* noop */ }
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
        recording = new AudioModule.AudioRecorder(CHUNK_RECORDING_OPTIONS);
        await recording.prepareToRecordAsync();
        // Reset peak and subscribe to metering updates for this cycle.
        peakMeteringRef.current = SILENCE_THRESHOLD_DBFS - 1;
        meteringSubRef.current = recording.addListener(
          'recordingStatusUpdate',
          (status: { metering?: number }) => {
            if (typeof status.metering === 'number' && status.metering > peakMeteringRef.current) {
              peakMeteringRef.current = status.metering;
            }
          }
        );
        recording.record();
        recordingRef.current = recording;
      } catch {
        if (recording) {
          try { recording.release(); } catch { /* noop */ }
        }
        recordingRef.current = null;
      }
    };

    // First segment immediately
    await captureAndSend();
    // Then every 1.5 seconds
    chunkTimerRef.current = setInterval(captureAndSend, 1500);
  }, []);

  const start = useCallback(async (config = useSessionStore.getState().getSessionConfig()) => {
    const store = useSessionStore.getState();
    store.reset();
    isActiveRef.current = true;
    wingmanClient.connect(config);

    // Elapsed time clock
    clockRef.current = setInterval(() => useSessionStore.getState().incrementElapsed(), 1000);

    await startChunkRecording();
    useSessionStore.getState().setRecording(true);
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

    meteringSubRef.current?.remove();
    meteringSubRef.current = null;

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

    audioQueueRef.current = [];

    wingmanClient.endSession();
    wingmanClient.disconnect();
    const store = useSessionStore.getState();
    store.setRecording(false);
    store.setWingmanSpeaking(false);
  }, []);

  return { start, stop };
}
