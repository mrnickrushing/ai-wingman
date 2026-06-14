import Constants from 'expo-constants';
import { getAuthToken } from './auth';

const SERVER_BASE = (() => {
  const wsUrl = (Constants.expoConfig?.extra?.serverUrl as string | undefined)
    ?? 'wss://wingman-server-production-5146.up.railway.app/ws';
  return wsUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/ws$/, '');
})();

export type TextCoachSuggestion = {
  bestReply: string;
  alternateReplies: Array<{ label: string; text: string }>;
  nextMove: string;
  rationale: string;
  whatToAvoid: string[];
  confidence: number;
};

export type TextCoachResult = {
  suggestion: TextCoachSuggestion;
  accountId: string;
};

export async function suggestTextReply(input: {
  thread: string;
  latestMessage: string;
  goal: string;
  relationship: string;
  tone: string;
  length: 'short' | 'balanced' | 'warm' | 'direct';
}): Promise<TextCoachResult> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Sign in to use Text Coach.');
  }

  const res = await fetch(`${SERVER_BASE}/coach/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const json = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error((json.error as string) ?? `Server error ${res.status}`);
  }

  return json as TextCoachResult;
}
