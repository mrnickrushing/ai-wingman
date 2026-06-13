export type ConversationMode = 'sales' | 'dating' | 'networking' | 'pitching' | 'hardconvos';

export interface SessionConfig {
  mode: ConversationMode;
  prospectContext?: string;
  callGoal?: string;
  objectionLibrary?: string;
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
