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

export type RoleplayTurn = {
  assistantReply: string;
  coaching: string;
  nextMove: string;
  followUpQuestion: string;
  intensity: 'low' | 'medium' | 'high';
  memory: {
    interests: string[];
    personalDetails: string[];
    callbackTopics: string[];
  };
};

export async function getRoleplayTurn(input: {
  mode: string;
  scenario: string;
  goal: string;
  context: string;
  memory: {
    interests: string[];
    personalDetails: string[];
    callbackTopics: string[];
  };
  transcript: string;
  userMessage: string;
  turnCount: number;
}): Promise<RoleplayTurn> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Sign in to use Practice roleplay.');
  }

  const res = await fetch(`${SERVER_BASE}/coach/roleplay`, {
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
  return (json.turn as RoleplayTurn) ?? (() => { throw new Error('Could not generate a roleplay response.'); })();
}
