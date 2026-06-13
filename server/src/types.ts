export type ConversationMode =
  | 'sales'
  | 'dating'
  | 'networking'
  | 'pitching'
  | 'hard_conversations';

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

// Messages from client → server
export type ClientMessage =
  | { type: 'start_session'; config: SessionConfig }
  | { type: 'audio_chunk'; data: string; mimeType?: string }   // base64-encoded audio container (m4a/aac/wav)
  | { type: 'end_session' };

// Messages from server → client
export type ServerMessage =
  | { type: 'session_started'; sessionId: string }
  | { type: 'transcript'; text: string; isFinal: boolean }
  | { type: 'coaching'; text: string }
  | { type: 'coaching_audio'; audio: string; mimeType: string }
  | { type: 'error'; message: string }
  | { type: 'session_ended' };

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}
