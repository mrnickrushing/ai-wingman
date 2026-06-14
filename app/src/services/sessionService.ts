import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'ai-wingman-jwt';

const SERVER_BASE = (() => {
  const wsUrl = (Constants.expoConfig?.extra?.serverUrl as string | undefined)
    ?? 'wss://wingman-server-production-5146.up.railway.app/ws';
  return wsUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/ws$/, '');
})();

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export type SessionAnalysis = {
  summary: string;
  strengths: string[];
  improvements: string[];
  keyMoment: string;
  followUps: Array<{ timing: string; text: string }>;
};

export type SavedSession = {
  id: string;
  mode: string;
  title: string;
  durationSeconds: number;
  wordsSpoken: number;
  coachingCount: number;
  score: number;
  rating: number;
  analysis: SessionAnalysis | null;
  transcriptText: string;
  createdAt: string;
};

export async function saveSession(input: {
  mode: string;
  title: string;
  durationSeconds: number;
  wordsSpoken: number;
  coachingCount: number;
  score: number;
  rating: number;
  transcriptText: string;
  coachingItems: string[];
  context: Record<string, string>;
}): Promise<SavedSession | null> {
  try {
    const token = await getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${SERVER_BASE}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const json = await res.json() as { session: SavedSession };
    return json.session;
  } catch {
    return null;
  }
}

export type SessionStats = {
  totalSessions: number;
  bestScore: number;
  streak: number;
};

export async function fetchStats(): Promise<SessionStats | null> {
  try {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch(`${SERVER_BASE}/sessions/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json() as SessionStats;
  } catch {
    return null;
  }
}

export async function listSessions(): Promise<SavedSession[]> {
  try {
    const token = await getToken();
    if (!token) return [];
    const res = await fetch(`${SERVER_BASE}/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json() as { sessions: SavedSession[] };
    return json.sessions;
  } catch {
    return [];
  }
}
