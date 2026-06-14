import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const SESSION_CACHE_KEY = 'wingman:session-cache';
const STATS_CACHE_KEY = 'wingman:stats-cache';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

async function loadCachedSessions(): Promise<SavedSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCachedSessions(sessions: SavedSession[]): Promise<void> {
  await AsyncStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessions.slice(0, 50))).catch(() => {});
}

async function loadCachedStats(): Promise<SessionStats | null> {
  try {
    const raw = await AsyncStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionStats;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveCachedStats(stats: SessionStats): Promise<void> {
  await AsyncStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats)).catch(() => {});
}

function buildStatsFromSessions(sessions: SavedSession[]): SessionStats {
  return {
    totalSessions: sessions.length,
    bestScore: sessions.reduce((best, session) => Math.max(best, session.score), 0),
    streak: 0,
  };
}

export type SessionAnalysis = {
  summary: string;
  strengths: string[];
  improvements: string[];
  keyMoment: string;
  followUps: Array<{ timing: string; text: string }>;
  secondDatePrep?: {
    recommendations: string[];
    conversationStarters: string[];
    nextDateIdea: string;
    remember: string[];
  };
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
    const cachedSessions = await loadCachedSessions();
    const nextSessions = [json.session, ...cachedSessions.filter((session) => session.id !== json.session.id)];
    const cachedStats = await loadCachedStats();
    await saveCachedSessions(nextSessions);
    await saveCachedStats({
      totalSessions: nextSessions.length,
      bestScore: nextSessions.reduce((best, session) => Math.max(best, session.score), 0),
      streak: cachedStats?.streak ?? 0,
    });
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
  const result = await fetchStatsFromServer();
  if (result.ok) {
    if (result.stats) await saveCachedStats(result.stats);
    return result.stats;
  }
  return null;
}

async function fetchStatsFromServer(): Promise<{ ok: boolean; stats: SessionStats | null }> {
  try {
    const token = await getToken();
    if (!token) return { ok: false, stats: null };
    const res = await fetch(`${SERVER_BASE}/sessions/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { ok: false, stats: null };
    const stats = await res.json() as SessionStats;
    return { ok: true, stats };
  } catch {
    return { ok: false, stats: null };
  }
}

export async function listSessions(): Promise<SavedSession[]> {
  const result = await listSessionsFromServer();
  if (result.ok) {
    await saveCachedSessions(result.sessions);
    return result.sessions;
  }
  return [];
}

async function listSessionsFromServer(): Promise<{ ok: boolean; sessions: SavedSession[] }> {
  try {
    const token = await getToken();
    if (!token) return { ok: false, sessions: [] };
    const res = await fetch(`${SERVER_BASE}/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { ok: false, sessions: [] };
    const json = await res.json() as { sessions: SavedSession[] };
    return { ok: true, sessions: json.sessions };
  } catch {
    return { ok: false, sessions: [] };
  }
}

export type SessionSnapshotSource = 'live' | 'cache' | 'empty';

export type SessionListSnapshot = {
  sessions: SavedSession[];
  source: SessionSnapshotSource;
};

export type SessionStatsSnapshot = {
  stats: SessionStats | null;
  source: SessionSnapshotSource;
};

export async function listSessionsSnapshot(): Promise<SessionListSnapshot> {
  const live = await listSessionsFromServer();
  if (live.ok) {
    await saveCachedSessions(live.sessions);
    return { sessions: live.sessions, source: 'live' };
  }
  const cached = await loadCachedSessions();
  return cached.length > 0 ? { sessions: cached, source: 'cache' } : { sessions: [], source: 'empty' };
}

export async function fetchStatsSnapshot(): Promise<SessionStatsSnapshot> {
  const live = await fetchStatsFromServer();
  if (live.ok) {
    if (live.stats) await saveCachedStats(live.stats);
    return { stats: live.stats, source: 'live' };
  }
  const cached = await loadCachedStats();
  if (cached) return { stats: cached, source: 'cache' };
  const sessions = await loadCachedSessions();
  if (sessions.length > 0) {
    return { stats: buildStatsFromSessions(sessions), source: 'cache' };
  }
  return { stats: null, source: 'empty' };
}
