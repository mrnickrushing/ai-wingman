import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export type AuthProvider = 'email' | 'apple' | 'google';

export type WingmanAccount = {
  id: string;
  provider: AuthProvider;
  email: string;
  displayName: string;
  premium: boolean;
  createdAt: string;
  updatedAt: string;
  passwordSalt?: string;
  passwordHash?: string;
  appleUserId?: string;
  googleSubject?: string;
};

export type LaunchSnapshot = {
  seenIntro: boolean;
  account: WingmanAccount | null;
};

const STORAGE_KEY = 'ai-wingman-launch-snapshot';

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function hashPassword(password: string, salt?: string): Promise<{ salt: string; hash: string }> {
  const saltBytes = salt ?? Array.from(await Crypto.getRandomBytesAsync(16)).map((n) => n.toString(16).padStart(2, '0')).join('');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${saltBytes}:${password}`,
  );
  return { salt: saltBytes, hash };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(value: string | undefined, fallbackEmail: string): string {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  const localPart = fallbackEmail.split('@')[0] ?? 'Wingman';
  return localPart.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Wingman';
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }
  throw new Error('Base64 decoder unavailable');
}

function decodeJwtPayload<T extends object = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as T;
  } catch {
    return null;
  }
}

async function readSnapshot(): Promise<LaunchSnapshot> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) {
    return { seenIntro: false, account: null };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LaunchSnapshot> & { account?: Partial<WingmanAccount> | null };
    return {
      seenIntro: Boolean(parsed.seenIntro),
      account: parsed.account
        ? {
            id: String(parsed.account.id ?? ''),
            provider: (parsed.account.provider as AuthProvider) ?? 'email',
            email: String(parsed.account.email ?? ''),
            displayName: String(parsed.account.displayName ?? ''),
            premium: Boolean(parsed.account.premium),
            createdAt: String(parsed.account.createdAt ?? nowIso()),
            updatedAt: String(parsed.account.updatedAt ?? nowIso()),
            passwordSalt: parsed.account.passwordSalt,
            passwordHash: parsed.account.passwordHash,
            appleUserId: parsed.account.appleUserId,
            googleSubject: parsed.account.googleSubject,
          }
        : null,
    };
  } catch {
    return { seenIntro: false, account: null };
  }
}

async function writeSnapshot(snapshot: LaunchSnapshot): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(snapshot));
}

export async function loadLaunchSnapshot(): Promise<LaunchSnapshot> {
  return readSnapshot();
}

export async function markIntroSeen(): Promise<LaunchSnapshot> {
  const snapshot = await readSnapshot();
  const next = { ...snapshot, seenIntro: true };
  await writeSnapshot(next);
  return next;
}

export async function registerEmailAccount(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<LaunchSnapshot> {
  const snapshot = await readSnapshot();
  const email = normalizeEmail(input.email);
  const { salt, hash } = await hashPassword(input.password);
  const account: WingmanAccount = {
    id: newId('acct'),
    provider: 'email',
    email,
    displayName: normalizeDisplayName(input.displayName, email),
    premium: false,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const next = { ...snapshot, seenIntro: true, account };
  await writeSnapshot(next);
  return next;
}

export async function loginEmailAccount(input: {
  email: string;
  password: string;
}): Promise<LaunchSnapshot> {
  const snapshot = await readSnapshot();
  const account = snapshot.account;
  const email = normalizeEmail(input.email);
  if (!account || account.provider !== 'email' || account.email !== email || !account.passwordHash || !account.passwordSalt) {
    throw new Error('No matching account found. Create one first.');
  }
  const { hash } = await hashPassword(input.password, account.passwordSalt);
  if (hash !== account.passwordHash) {
    throw new Error('Email or password is incorrect.');
  }
  const next: LaunchSnapshot = {
    ...snapshot,
    seenIntro: true,
    account: { ...account, updatedAt: nowIso() },
  };
  await writeSnapshot(next);
  return next;
}

export async function signInWithApple(input: {
  userId: string;
  email?: string;
  displayName?: string;
}): Promise<LaunchSnapshot> {
  const snapshot = await readSnapshot();
  const email = normalizeEmail(input.email ?? `apple-${input.userId}@apple.local`);
  const account: WingmanAccount = snapshot.account?.provider === 'apple' && snapshot.account.appleUserId === input.userId
    ? {
        ...snapshot.account,
        email,
        displayName: normalizeDisplayName(input.displayName, email),
        updatedAt: nowIso(),
      }
    : {
        id: newId('acct'),
        provider: 'apple',
        email,
        displayName: normalizeDisplayName(input.displayName, email),
        premium: false,
        appleUserId: input.userId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
  const next: LaunchSnapshot = { ...snapshot, seenIntro: true, account };
  await writeSnapshot(next);
  return next;
}

export async function signInWithGoogle(input: {
  idToken: string;
  fallbackEmail?: string;
  fallbackName?: string;
}): Promise<LaunchSnapshot> {
  const snapshot = await readSnapshot();
  const payload = decodeJwtPayload<Record<string, unknown>>(input.idToken);
  const subject = typeof payload?.sub === 'string' ? payload.sub : input.idToken;
  const email = normalizeEmail(
    (typeof payload?.email === 'string' ? payload.email : undefined)
      ?? input.fallbackEmail
      ?? `google-${subject.slice(0, 16)}@google.local`,
  );
  const displayName = normalizeDisplayName(
    typeof payload?.name === 'string' ? payload.name : input.fallbackName,
    email,
  );
  const account: WingmanAccount = snapshot.account?.provider === 'google' && snapshot.account.googleSubject === subject
    ? {
        ...snapshot.account,
        email,
        displayName,
        updatedAt: nowIso(),
      }
    : {
        id: newId('acct'),
        provider: 'google',
        email,
        displayName,
        premium: false,
        googleSubject: subject,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
  const next: LaunchSnapshot = { ...snapshot, seenIntro: true, account };
  await writeSnapshot(next);
  return next;
}

export async function markPremium(): Promise<LaunchSnapshot> {
  const snapshot = await readSnapshot();
  if (!snapshot.account) return snapshot;
  const next: LaunchSnapshot = {
    ...snapshot,
    account: { ...snapshot.account, premium: true, updatedAt: nowIso() },
  };
  await writeSnapshot(next);
  return next;
}

export async function signOut(): Promise<LaunchSnapshot> {
  const snapshot = await readSnapshot();
  const next: LaunchSnapshot = {
    seenIntro: snapshot.seenIntro,
    account: null,
  };
  await writeSnapshot(next);
  return next;
}

export async function resetLaunchState(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
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
