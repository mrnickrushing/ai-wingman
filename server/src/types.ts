export type ConversationMode =
  | 'sales'
  | 'dating'
  | 'networking'
  | 'pitching'
  | 'hard_conversations';

export type SessionInteractionMode = 'coach' | 'roleplay';

export type HardConversationScenario =
  | 'salary_negotiation'
  | 'firing'
  | 'breakup'
  | 'confrontation'
  | 'dispute'
  | 'therapy';

export interface SessionConfig {
  mode: ConversationMode;
  interactionMode?: SessionInteractionMode;
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

  // Voice roleplay
  roleplayScenario?: string;
  roleplayGoal?: string;
  roleplayContext?: string;
  roleplayMemory?: {
    interests: string[];
    personalDetails: string[];
    callbackTopics: string[];
  };
}

// Messages from client → server
export type ClientMessage =
  | { type: 'start_session'; config: SessionConfig }
  | { type: 'audio_chunk'; data: string; mimeType?: string; sampleRate?: number; channels?: number }   // base64-encoded audio, either PCM stream or container file
  | { type: 'end_session' };

export type SessionServerMessage =
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'coaching'; text: string }
  | { type: 'coaching_audio'; audio: string; mimeType: string }
  | { type: 'error'; message: string };

// Every asynchronous message emitted by a Session is tagged with its immutable
// id so a late provider response cannot bleed into a replacement session.
export type ServerMessage =
  | { type: 'session_started'; sessionId: string }
  | ({ sessionId: string } & SessionServerMessage)
  | { type: 'error'; message: string; sessionId?: string }
  | { type: 'session_ended'; sessionId: string };

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}
