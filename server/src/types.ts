export type ConversationMode = 'sales' | 'dating' | 'networking' | 'pitching' | 'hardconvos';

export interface SessionConfig {
  mode: ConversationMode;
  prospectContext?: string;
  callGoal?: string;
  objectionLibrary?: string;
}

// Messages from client → server
export type ClientMessage =
  | { type: 'start_session'; config: SessionConfig }
  | { type: 'audio_chunk'; data: string }   // base64-encoded PCM audio
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
