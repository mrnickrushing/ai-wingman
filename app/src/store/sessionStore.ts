import { create } from 'zustand';
import { SessionConfig, TranscriptEntry, CoachingEntry } from '../types';

interface SalesSetup {
  prospectName: string;
  company: string;
  role: string;
  linkedInUrl: string;
  callGoal: string;
  objectionLibrary: string;
}

interface SessionStore {
  // Pre-call configuration
  salesSetup: SalesSetup;
  setSalesSetup: (setup: Partial<SalesSetup>) => void;

  // Active session state
  sessionId: string | null;
  isConnected: boolean;
  isReconnecting: boolean;
  isRecording: boolean;
  isWingmanSpeaking: boolean;
  error: string | null;
  transcript: TranscriptEntry[];
  coachingHistory: CoachingEntry[];
  currentCoaching: string | null;
  elapsedSeconds: number;
  wordsSelf: number;
  lastRating: number;

  // Actions
  setSessionId: (id: string | null) => void;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setRecording: (recording: boolean) => void;
  setWingmanSpeaking: (speaking: boolean) => void;
  setError: (error: string | null) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  updateLastTranscript: (text: string) => void;
  addCoaching: (entry: CoachingEntry) => void;
  setCurrentCoaching: (text: string | null) => void;
  incrementElapsed: () => void;
  incrementWords: (count: number) => void;
  setRating: (rating: number) => void;
  reset: () => void;

  // Computed
  getSessionConfig: () => SessionConfig;
}

const defaultSalesSetup: SalesSetup = {
  prospectName: '',
  company: '',
  role: '',
  linkedInUrl: '',
  callGoal: '',
  objectionLibrary: '',
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  salesSetup: defaultSalesSetup,
  setSalesSetup: (setup) =>
    set((s) => ({ salesSetup: { ...s.salesSetup, ...setup } })),

  sessionId: null,
  isConnected: false,
  isReconnecting: false,
  isRecording: false,
  isWingmanSpeaking: false,
  error: null,
  transcript: [],
  coachingHistory: [],
  currentCoaching: null,
  elapsedSeconds: 0,
  wordsSelf: 0,
  lastRating: 0,

  setSessionId: (id) => set({ sessionId: id }),
  setConnected: (connected) => set({ isConnected: connected }),
  setReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
  setRecording: (recording) => set({ isRecording: recording }),
  setWingmanSpeaking: (speaking) => set({ isWingmanSpeaking: speaking }),
  setError: (error) => set({ error }),

  addTranscript: (entry) =>
    set((s) => ({ transcript: [...s.transcript.slice(-100), entry] })),

  updateLastTranscript: (text) =>
    set((s) => {
      const last = s.transcript[s.transcript.length - 1];
      if (last && !last.isFinal) {
        const updated = [...s.transcript];
        updated[updated.length - 1] = { ...last, text };
        return { transcript: updated };
      }
      return {};
    }),

  addCoaching: (entry) =>
    set((s) => ({ coachingHistory: [...s.coachingHistory.slice(-50), entry] })),

  setCurrentCoaching: (text) => set({ currentCoaching: text }),

  incrementElapsed: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  incrementWords: (count) => set((s) => ({ wordsSelf: s.wordsSelf + count })),

  setRating: (rating) => set({ lastRating: rating }),

  reset: () =>
    set({
      sessionId: null,
      isConnected: false,
      isReconnecting: false,
      isRecording: false,
      isWingmanSpeaking: false,
      error: null,
      transcript: [],
      coachingHistory: [],
      currentCoaching: null,
      elapsedSeconds: 0,
      wordsSelf: 0,
      lastRating: 0,
    }),

  getSessionConfig: (): SessionConfig => {
    const { salesSetup } = get();
    const prospectContext = [
      salesSetup.prospectName && `Name: ${salesSetup.prospectName}`,
      salesSetup.company && `Company: ${salesSetup.company}`,
      salesSetup.role && `Role: ${salesSetup.role}`,
      salesSetup.linkedInUrl && `LinkedIn: ${salesSetup.linkedInUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      mode: 'sales',
      prospectContext,
      callGoal: salesSetup.callGoal,
      objectionLibrary: salesSetup.objectionLibrary,
    };
  },
}));
