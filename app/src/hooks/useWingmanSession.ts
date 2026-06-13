import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { wingmanClient } from '../services/wingmanClient';
import { useSessionStore } from '../store/sessionStore';
import { TranscriptEntry, CoachingEntry } from '../types';

let idCounter = 0;
const nextId = () => String(++idCounter);

export function useWingmanSession() {
  const store = useSessionStore();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);

  // Wire up WebSocket events
  useEffect(() => {
    const unsubscribe = wingmanClient.on((event) => {
      if (event.type === 'connected') {
        store.setConnected(true);
      } else if (event.type === 'disconnected') {
        store.setConnected(false);
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
          store.incrementWords(event.text.split(' ').length);
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
        // Auto-dismiss coaching after 6 seconds
        setTimeout(() => store.setCurrentCoaching(null), 6000);
      } else if (event.type === 'session_ended') {
        store.setSessionId(null);
      }
    });

    return unsubscribe;
  }, []);

  const startChunkRecording = useCallback(async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });

    const captureAndSend = async () => {
      if (!isActiveRef.current) return;

      // Stop any existing recording and grab audio
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          if (uri) {
            const b64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            wingmanClient.sendAudioChunk(b64);
            await FileSystem.deleteAsync(uri, { idempotent: true });
          }
        } catch {
          // ignore errors during capture cycle
        }
      }

      if (!isActiveRef.current) return;

      // Start a new recording segment
      const recording = new Audio.Recording();
      try {
        await recording.prepareToRecordAsync({
          isMeteringEnabled: false,
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 16 * 16000,
          },
          ios: {
            extension: '.wav',
            audioQuality: Audio.IOSAudioQuality.MEDIUM,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 16 * 16000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {},
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

  const start = useCallback(
    async (config = store.getSessionConfig()) => {
      store.reset();
      isActiveRef.current = true;
      wingmanClient.connect(config);

      // Elapsed time clock
      clockRef.current = setInterval(() => store.incrementElapsed(), 1000);

      await startChunkRecording();
      store.setRecording(true);
    },
    [store, startChunkRecording]
  );

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

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // already stopped
      }
      recordingRef.current = null;
    }

    wingmanClient.endSession();
    wingmanClient.disconnect();
    store.setRecording(false);
  }, [store]);

  return { start, stop };
}
