export type ConversationMode = 'sales' | 'dating' | 'networking' | 'pitching' | 'hardconvos';

export interface SessionConfig {
  mode: ConversationMode;
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
