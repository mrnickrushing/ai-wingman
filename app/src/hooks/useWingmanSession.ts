import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { wingmanClient } from '../services/wingmanClient';
import { useSessionStore } from '../store/sessionStore';
import { TranscriptEntry, CoachingEntry } from '../types';

let idCounter = 0;
const nextId = () => String(++idCounter);

const COACHING_VISIBLE_MS = 6000;

export function useWingmanSession() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      let sound: Audio.Sound | null = null;
      try {
        await FileSystem.writeAsStringAsync(uri, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const created = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, volume: 1.0 }
        );
        sound = created.sound;
        setWingmanSpeaking(true);
        await new Promise<void>((resolve) => {
          sound!.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) {
              if (status.error) resolve();
              return;
            }
            if (status.didJustFinish) resolve();
          });
        });
      } catch {
        // ignore playback errors — text coaching is still shown on screen
      } finally {
        if (sound) {
          try { await sound.unloadAsync(); } catch { /* noop */ }
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
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const captureAndSend = async () => {
      if (!isActiveRef.current) return;

      // Stop the current segment and ship it as a complete container file.
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          if (uri) {
            const b64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            wingmanClient.sendAudioChunk(b64, 'audio/mp4');
            await FileSystem.deleteAsync(uri, { idempotent: true });
          }
        } catch {
          // ignore errors during capture cycle
        }
      }

      if (!isActiveRef.current) return;

      // Start a new recording segment. We record a complete AAC/m4a container
      // each cycle (reliable on both iOS and Android); Deepgram auto-detects
      // the codec server-side.
      const recording = new Audio.Recording();
      try {
        await recording.prepareToRecordAsync({
          isMeteringEnabled: false,
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 64000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.MEDIUM,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 64000,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 64000,
          },
        });
        await recording.startAsync();
        recordingRef.current = recording;
      } catch {
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

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // already stopped
      }
      recordingRef.current = null;
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
