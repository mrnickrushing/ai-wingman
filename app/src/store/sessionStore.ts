import { create } from 'zustand';
import {
  ConversationMode,
  ServerHealthStatus,
  SessionPhase,
  SessionConfig,
  TranscriptEntry,
  CoachingEntry,
  HardConversationScenario,
} from '../types';

interface SalesSetup {
  prospectName: string;
  company: string;
  role: string;
  linkedInUrl: string;
  callGoal: string;
  objectionLibrary: string;
}

interface DatingSetup {
  name: string;
  profileUrl: string;
  intent: string;
}

interface NetworkingSetup {
  eventName: string;
  attendees: string;
}

interface PitchingSetup {
  title: string;
  deck: string;
  audience: string;
}

interface HardConvoSetup {
  scenario: HardConversationScenario | null;
  situation: string;
  goal: string;
}

interface SessionStore {
  // Pre-session configuration (per mode)
  salesSetup: SalesSetup;
  setSalesSetup: (setup: Partial<SalesSetup>) => void;
  datingSetup: DatingSetup;
  setDatingSetup: (setup: Partial<DatingSetup>) => void;
  networkingSetup: NetworkingSetup;
  setNetworkingSetup: (setup: Partial<NetworkingSetup>) => void;
  pitchingSetup: PitchingSetup;
  setPitchingSetup: (setup: Partial<PitchingSetup>) => void;
  hardConvoSetup: HardConvoSetup;
  setHardConvoSetup: (setup: Partial<HardConvoSetup>) => void;

  // Active session state
  sessionId: string | null;
  sessionPhase: SessionPhase;
  serverHealth: ServerHealthStatus;
  micPermissionGranted: boolean | null;
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
  loggedContacts: string[];
  lastTranscriptAt: number | null;
  lastAudioChunkAt: number | null;
  micLevelDb: number | null;
  lastErrorAt: number | null;
  lastSessionStartedAt: number | null;

  // Lifetime stats (non-persisted — reset when the app process restarts).
  // Surfaced on the Home screen. recordSession() is called once per finished
  // session from the Post screens.
  sessions: number;
  bestScore: number;
  streak: number;
  lastSessionDay: string | null;

  // Actions
  setSessionId: (id: string | null) => void;
  setSessionPhase: (phase: SessionPhase) => void;
  setServerHealth: (status: ServerHealthStatus) => void;
  setMicPermissionGranted: (granted: boolean | null) => void;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setRecording: (recording: boolean) => void;
  setWingmanSpeaking: (speaking: boolean) => void;
  setError: (error: string | null) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  updateLastTranscript: (text: string) => void;
  addCoaching: (entry: CoachingEntry) => void;
  setCurrentCoaching: (text: string | null) => void;
  setLastTranscriptAt: (timestamp: number | null) => void;
  setLastAudioChunkAt: (timestamp: number | null) => void;
  setMicLevelDb: (level: number | null) => void;
  setLastErrorAt: (timestamp: number | null) => void;
  setLastSessionStartedAt: (timestamp: number | null) => void;
  incrementElapsed: () => void;
  incrementWords: (count: number) => void;
  setRating: (rating: number) => void;
  addLoggedContact: (name: string) => void;
  recordSession: (score: number) => void;
  reset: () => void;

  // Computed
  getSessionConfig: (mode?: ConversationMode) => SessionConfig;
}

const defaultSalesSetup: SalesSetup = {
  prospectName: '',
  company: '',
  role: '',
  linkedInUrl: '',
  callGoal: '',
  objectionLibrary: '',
};

const defaultDatingSetup: DatingSetup = {
  name: '',
  profileUrl: '',
  intent: '',
};

const defaultNetworkingSetup: NetworkingSetup = {
  eventName: '',
  attendees: '',
};

const defaultPitchingSetup: PitchingSetup = {
  title: '',
  deck: '',
  audience: '',
};

const defaultHardConvoSetup: HardConvoSetup = {
  scenario: null,
  situation: '',
  goal: '',
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  salesSetup: defaultSalesSetup,
  setSalesSetup: (setup) =>
    set((s) => ({ salesSetup: { ...s.salesSetup, ...setup } })),
  datingSetup: defaultDatingSetup,
  setDatingSetup: (setup) =>
    set((s) => ({ datingSetup: { ...s.datingSetup, ...setup } })),
  networkingSetup: defaultNetworkingSetup,
  setNetworkingSetup: (setup) =>
    set((s) => ({ networkingSetup: { ...s.networkingSetup, ...setup } })),
  pitchingSetup: defaultPitchingSetup,
  setPitchingSetup: (setup) =>
    set((s) => ({ pitchingSetup: { ...s.pitchingSetup, ...setup } })),
  hardConvoSetup: defaultHardConvoSetup,
  setHardConvoSetup: (setup) =>
    set((s) => ({ hardConvoSetup: { ...s.hardConvoSetup, ...setup } })),

  sessionId: null,
  sessionPhase: 'idle',
  serverHealth: 'unknown',
  micPermissionGranted: null,
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
  loggedContacts: [],
  lastTranscriptAt: null,
  lastAudioChunkAt: null,
  micLevelDb: null,
  lastErrorAt: null,
  lastSessionStartedAt: null,

  sessions: 0,
  bestScore: 0,
  streak: 0,
  lastSessionDay: null,

  setSessionId: (id) => set({ sessionId: id }),
  setSessionPhase: (phase) => set({ sessionPhase: phase }),
  setServerHealth: (serverHealth) => set({ serverHealth }),
  setMicPermissionGranted: (micPermissionGranted) => set({ micPermissionGranted }),
  setConnected: (connected) => set({ isConnected: connected }),
  setReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
  setRecording: (recording) => set({ isRecording: recording }),
  setWingmanSpeaking: (speaking) => set({ isWingmanSpeaking: speaking }),
  setError: (error) => set({ error, lastErrorAt: error ? Date.now() : null }),

  addTranscript: (entry) =>
    set((s) => ({ transcript: [...s.transcript, entry] })),

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
  setLastTranscriptAt: (timestamp) => set({ lastTranscriptAt: timestamp }),
  setLastAudioChunkAt: (timestamp) => set({ lastAudioChunkAt: timestamp }),
  setMicLevelDb: (micLevelDb) => set({ micLevelDb }),
  setLastErrorAt: (timestamp) => set({ lastErrorAt: timestamp }),
  setLastSessionStartedAt: (timestamp) => set({ lastSessionStartedAt: timestamp }),

  incrementElapsed: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  incrementWords: (count) => set((s) => ({ wordsSelf: s.wordsSelf + count })),

  setRating: (rating) => set({ lastRating: rating }),

  addLoggedContact: (name) =>
    set((s) => ({ loggedContacts: [...s.loggedContacts, name] })),

  recordSession: (score) =>
    set((s) => {
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let streak = s.streak;
      if (s.lastSessionDay === today) {
        // already counted a session today — streak unchanged
        streak = Math.max(streak, 1);
      } else if (s.lastSessionDay === yesterday) {
        streak = s.streak + 1;
      } else {
        streak = 1;
      }
      return {
        sessions: s.sessions + 1,
        bestScore: Math.max(s.bestScore, score),
        streak,
        lastSessionDay: today,
      };
    }),

  reset: () =>
    set({
      sessionId: null,
      sessionPhase: 'idle',
      serverHealth: 'unknown',
      micPermissionGranted: null,
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
      loggedContacts: [],
      lastTranscriptAt: null,
      lastAudioChunkAt: null,
      micLevelDb: null,
      lastErrorAt: null,
      lastSessionStartedAt: null,
    }),

  getSessionConfig: (mode: ConversationMode = 'sales'): SessionConfig => {
    const { salesSetup, datingSetup, networkingSetup, pitchingSetup, hardConvoSetup } = get();

    if (mode === 'dating') {
      return {
        mode: 'dating',
        keywords: ['date', 'text', 'plan', 'chemistry', 'vibe', 'kiss', 'follow up'],
        datingName: datingSetup.name,
        datingProfileUrl: datingSetup.profileUrl,
        datingIntent: datingSetup.intent,
      };
    }

    if (mode === 'networking') {
      return {
        mode: 'networking',
        keywords: ['intro', 'follow up', 'contact', 'connection', 'referral', 'conference', 'meetup'],
        eventName: networkingSetup.eventName,
        attendeeList: networkingSetup.attendees,
      };
    }

    if (mode === 'pitching') {
      return {
        mode: 'pitching',
        keywords: ['pitch', 'deck', 'traction', 'metrics', 'valuation', 'investor', 'demo', 'burn'],
        pitchTitle: pitchingSetup.title,
        pitchDeck: pitchingSetup.deck,
        audienceType: pitchingSetup.audience,
      };
    }

    if (mode === 'hard_conversations') {
      return {
        mode: 'hard_conversations',
        keywords: ['boundary', 'salary', 'raise', 'breakup', 'firing', 'landlord', 'de-escalate', 'apology'],
        scenario: hardConvoSetup.scenario ?? 'confrontation',
        situation: hardConvoSetup.situation,
        conversationGoal: hardConvoSetup.goal,
      };
    }

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
      keywords: ['objection', 'close', 'demo', 'budget', 'decision', 'next step', 'proposal', 'renewal'],
      prospectContext,
      callGoal: salesSetup.callGoal,
      objectionLibrary: salesSetup.objectionLibrary,
    };
  },
}));
