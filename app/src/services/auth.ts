import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// ── Types ────────────────────────────────────────────────────────────────────

export type AuthProvider = 'email' | 'apple' | 'google';

export type WingmanAccount = {
  id: string;
  provider: AuthProvider;
  email: string;
  displayName: string;
  premium: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LaunchSnapshot = {
  seenIntro: boolean;
  account: WingmanAccount | null;
};

// ── Storage keys ─────────────────────────────────────────────────────────────

const SNAPSHOT_KEY = 'ai-wingman-launch-snapshot';
const JWT_KEY = 'ai-wingman-jwt';

// ── Server base URL ───────────────────────────────────────────────────────────

const SERVER_BASE = (() => {
  const wsUrl = (Constants.expoConfig?.extra?.serverUrl as string | undefined)
    ?? 'wss://wingman-server-production-5146.up.railway.app/ws';
  return wsUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/ws$/, '');
})();

// ── JWT helpers ────────────────────────────────────────────────────────────────

async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

async function loadToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY);
}

function isTokenExpired(token: string): boolean {
  try {
    const raw = token.split('.')[1] ?? '';
    const payload = JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return !payload.exp || payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// ── Local snapshot cache ───────────────────────────────────────────────────────

async function readLocalSnapshot(): Promise<LaunchSnapshot> {
  const raw = await SecureStore.getItemAsync(SNAPSHOT_KEY);
  if (!raw) return { seenIntro: false, account: null };
  try {
    const parsed = JSON.parse(raw) as Partial<LaunchSnapshot>;
    return {
      seenIntro: Boolean(parsed.seenIntro),
      account: parsed.account
        ? {
            id: String(parsed.account.id ?? ''),
            provider: (parsed.account.provider as AuthProvider) ?? 'email',
            email: String(parsed.account.email ?? ''),
            displayName: String(parsed.account.displayName ?? ''),
            premium: Boolean(parsed.account.premium),
            createdAt: String(parsed.account.createdAt ?? new Date().toISOString()),
            updatedAt: String(parsed.account.updatedAt ?? new Date().toISOString()),
          }
        : null,
    };
  } catch {
    return { seenIntro: false, account: null };
  }
}

async function writeLocalSnapshot(snapshot: LaunchSnapshot): Promise<void> {
  await SecureStore.setItemAsync(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

// ── Server API helpers ─────────────────────────────────────────────────────────

type Ok<T> = { data: T; error?: never };
type Err = { data?: never; error: string };

async function serverPost<T>(
  path: string,
  body: object,
  token?: string | null
): Promise<Ok<T> | Err> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${SERVER_BASE}${path}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) return { error: (json.error as string) ?? `Server error ${res.status}` };
    return { data: json as T };
  } catch (err) {
    return { error: (err as Error).message ?? 'Network error' };
  }
}

async function serverGet<T>(path: string, token: string): Promise<Ok<T> | Err> {
  try {
    const res = await fetch(`${SERVER_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) return { error: (json.error as string) ?? `Server error ${res.status}` };
    return { data: json as T };
  } catch (err) {
    return { error: (err as Error).message ?? 'Network error' };
  }
}

async function serverPatch<T>(path: string, token: string): Promise<Ok<T> | Err> {
  try {
    const res = await fetch(`${SERVER_BASE}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) return { error: (json.error as string) ?? `Server error ${res.status}` };
    return { data: json as T };
  } catch (err) {
    return { error: (err as Error).message ?? 'Network error' };
  }
}

// ── Server ↔ local type mapping ────────────────────────────────────────────────

type ServerAccount = {
  id: string; provider: AuthProvider; email: string; displayName: string;
  premium: boolean; seenIntro: boolean; createdAt: string; updatedAt: string;
};

function snapshotFromServer(sa: ServerAccount): LaunchSnapshot {
  return {
    seenIntro: sa.seenIntro,
    account: {
      id: sa.id, provider: sa.provider, email: sa.email,
      displayName: sa.displayName, premium: sa.premium,
      createdAt: sa.createdAt, updatedAt: sa.updatedAt,
    },
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function loadLaunchSnapshot(): Promise<LaunchSnapshot> {
  const token = await loadToken();
  if (!token || isTokenExpired(token)) {
    // No valid session — preserve seenIntro but show as signed out
    const local = await readLocalSnapshot();
    return { seenIntro: local.seenIntro, account: null };
  }
  // Refresh from server; fall back to local cache on network failure
  const result = await serverGet<{ account: ServerAccount }>('/auth/me', token);
  if (result.error || !result.data) return readLocalSnapshot();
  const snapshot = snapshotFromServer(result.data.account);
  await writeLocalSnapshot(snapshot);
  return snapshot;
}

export async function markIntroSeen(): Promise<LaunchSnapshot> {
  const token = await loadToken();
  if (token && !isTokenExpired(token)) {
    const result = await serverPatch<{ account: ServerAccount }>('/auth/seen-intro', token);
    if (!result.error && result.data) {
      const snapshot = snapshotFromServer(result.data.account);
      await writeLocalSnapshot(snapshot);
      return snapshot;
    }
  }
  const local = await readLocalSnapshot();
  const next = { ...local, seenIntro: true };
  await writeLocalSnapshot(next);
  return next;
}

export async function registerEmailAccount(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<LaunchSnapshot> {
  const result = await serverPost<{ token: string; account: ServerAccount }>('/auth/register', {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    displayName: input.displayName,
  });
  if (result.error || !result.data) throw new Error(result.error ?? 'Registration failed.');
  await saveToken(result.data.token);
  const snapshot = snapshotFromServer(result.data.account);
  await writeLocalSnapshot(snapshot);
  return snapshot;
}

export async function loginEmailAccount(input: {
  email: string;
  password: string;
}): Promise<LaunchSnapshot> {
  const result = await serverPost<{ token: string; account: ServerAccount }>('/auth/login', {
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (result.error || !result.data) throw new Error(result.error ?? 'Login failed.');
  await saveToken(result.data.token);
  const snapshot = snapshotFromServer(result.data.account);
  await writeLocalSnapshot(snapshot);
  return snapshot;
}

export async function signInWithApple(input: {
  userId: string;
  email?: string;
  displayName?: string;
}): Promise<LaunchSnapshot> {
  const result = await serverPost<{ token: string; account: ServerAccount }>('/auth/apple', {
    userId: input.userId,
    email: input.email,
    displayName: input.displayName,
  });
  if (result.error || !result.data) throw new Error(result.error ?? 'Apple sign-in failed.');
  await saveToken(result.data.token);
  const snapshot = snapshotFromServer(result.data.account);
  await writeLocalSnapshot(snapshot);
  return snapshot;
}

export async function signInWithGoogle(input: {
  idToken: string;
  fallbackEmail?: string;
  fallbackName?: string;
}): Promise<LaunchSnapshot> {
  const result = await serverPost<{ token: string; account: ServerAccount }>('/auth/google', {
    idToken: input.idToken,
    fallbackEmail: input.fallbackEmail,
    fallbackName: input.fallbackName,
  });
  if (result.error || !result.data) throw new Error(result.error ?? 'Google sign-in failed.');
  await saveToken(result.data.token);
  const snapshot = snapshotFromServer(result.data.account);
  await writeLocalSnapshot(snapshot);
  return snapshot;
}

export async function markPremium(): Promise<LaunchSnapshot> {
  const token = await loadToken();
  if (token && !isTokenExpired(token)) {
    const result = await serverPatch<{ account: ServerAccount }>('/auth/premium', token);
    if (!result.error && result.data) {
      const snapshot = snapshotFromServer(result.data.account);
      await writeLocalSnapshot(snapshot);
      return snapshot;
    }
    throw new Error(result.error ?? 'Could not activate membership on the backend.');
  }
  const local = await readLocalSnapshot();
  if (!local.account) throw new Error('No active account.');
  throw new Error('Sign in again before activating membership.');
}

export async function signOut(): Promise<LaunchSnapshot> {
  await clearToken();
  const local = await readLocalSnapshot();
  const next: LaunchSnapshot = { seenIntro: local.seenIntro, account: null };
  await writeLocalSnapshot(next);
  return next;
}

export async function resetLaunchState(): Promise<void> {
  const token = await loadToken();
  if (token && !isTokenExpired(token)) {
    try {
      await fetch(`${SERVER_BASE}/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore — local data still cleared */ }
  }
  await clearToken();
  await SecureStore.deleteItemAsync(SNAPSHOT_KEY);
}

export function hasGoogleConfig(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
    || process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID
  );
}

export function getGoogleClientIds(): {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
  expoClientId?: string;
} {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  };
}

// kept to avoid unused-import warning
void Crypto.getRandomBytesAsync;
