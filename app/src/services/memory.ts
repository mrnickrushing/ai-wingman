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

export type AccountMemory = {
  interests: string[];
  personalDetails: string[];
  callbackTopics: string[];
  followUps: Array<{ timing: string; text: string; mode: string; sessionId: string; createdAt: string }>;
  recentSessionTitles: string[];
  recentModes: string[];
  lastSummary: string;
  lastUpdatedAt: string;
};

export type MemoryBrief = {
  title: string;
  summary: string;
  nextMove: string;
};

export type MemorySession = {
  id: string;
  title: string;
  mode: string;
  score: number;
  createdAt: string;
  summary: string;
};

export type MemorySnapshot = {
  memory: AccountMemory;
  recentSessions: MemorySession[];
  followUps: Array<{ timing: string; text: string; mode: string; sessionId: string; createdAt: string }>;
  brief: MemoryBrief;
};

export async function fetchMemoryBrief(): Promise<MemorySnapshot | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const res = await fetch(`${SERVER_BASE}/memory/brief`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  if (!json || typeof json !== 'object') return null;
  return json as MemorySnapshot;
}
