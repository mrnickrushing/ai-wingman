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
  isRecording: boolean;
  transcript: TranscriptEntry[];
  coachingHistory: CoachingEntry[];
  currentCoaching: string | null;
  elapsedSeconds: number;
  wordsSelf: number;
  wordsOther: number;

  // Actions
  setSessionId: (id: string | null) => void;
  setConnected: (connected: boolean) => void;
  setRecording: (recording: boolean) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  updateLastTranscript: (text: string) => void;
  addCoaching: (entry: CoachingEntry) => void;
  setCurrentCoaching: (text: string | null) => void;
  incrementElapsed: () => void;
  incrementWords: (count: number) => void;
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
  isRecording: false,
  transcript: [],
  coachingHistory: [],
  currentCoaching: null,
  elapsedSeconds: 0,
  wordsSelf: 0,
  wordsOther: 0,

  setSessionId: (id) => set({ sessionId: id }),
  setConnected: (connected) => set({ isConnected: connected }),
  setRecording: (recording) => set({ isRecording: recording }),

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

  reset: () =>
    set({
      sessionId: null,
      isConnected: false,
      isRecording: false,
      transcript: [],
      coachingHistory: [],
      currentCoaching: null,
      elapsedSeconds: 0,
      wordsSelf: 0,
      wordsOther: 0,
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
