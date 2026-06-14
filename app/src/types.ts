export type ConversationMode =
  | 'sales'
  | 'dating'
  | 'networking'
  | 'pitching'
  | 'hard_conversations';

export type SessionPhase =
  | 'idle'
  | 'connecting'
  | 'checking_server'
  | 'ready'
  | 'recording'
  | 'streaming'
  | 'coaching'
  | 'error';

export type ServerHealthStatus = 'unknown' | 'checking' | 'online' | 'offline';

export type HardConversationScenario =
  | 'salary_negotiation'
  | 'firing'
  | 'breakup'
  | 'confrontation'
  | 'dispute'
  | 'therapy';

export interface SessionConfig {
  mode: ConversationMode;
  // Optional mode-specific terms to bias STT toward (e.g. "anchor",
  // "counter-offer", "objection"). Passed through to Deepgram as keyword
  // boosts so domain jargon is transcribed more accurately.
  keywords?: string[];
  // Sales
  prospectContext?: string;
  callGoal?: string;
  objectionLibrary?: string;
  // Dating
  datingName?: string;
  datingProfileUrl?: string;
  datingIntent?: string;
  // Networking
  eventName?: string;
  attendeeList?: string;
  // Pitching
  pitchTitle?: string;
  pitchDeck?: string;
  audienceType?: string;
  // Hard Conversations
  scenario?: HardConversationScenario;
  situation?: string;
  conversationGoal?: string;
}

export interface TranscriptEntry {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface CoachingEntry {
  id: string;
  text: string;
  timestamp: number;
}

export interface SessionRecap {
  id: string;
  mode: ConversationMode;
  title: string;
  subtitle: string;
  score: number;
  durationSeconds: number;
  coachingTips: number;
  wordsSelf: number;
  rating: number;
  summary: string;
  highlights: string[];
  createdAt: string;
}

export interface SessionHealthSnapshot {
  phase: SessionPhase;
  serverHealth: ServerHealthStatus;
  micPermissionGranted: boolean | null;
  isConnected: boolean;
  isReconnecting: boolean;
  isRecording: boolean;
  transcriptCount: number;
  coachingCount: number;
  lastTranscriptAt: number | null;
  lastAudioChunkAt: number | null;
  lastErrorAt: number | null;
  lastSessionStartedAt: number | null;
  error: string | null;
}
