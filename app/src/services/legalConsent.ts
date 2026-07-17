import AsyncStorage from '@react-native-async-storage/async-storage';

export const LEGAL_CONSENT_VERSION = '2026-07-17';
export const LEGAL_CONSENT_STORAGE_KEY = 'wingman:legal-consent';

export const REQUIRED_LEGAL_ACKNOWLEDGMENTS = [
  'ai-limitations',
  'participant-consent',
  'audio-and-transcripts',
  'terms-and-privacy',
] as const;

export type LegalAcknowledgment = typeof REQUIRED_LEGAL_ACKNOWLEDGMENTS[number];

export type LegalConsentAcceptance = {
  version: string;
  acceptedAt: string;
  acknowledgments: LegalAcknowledgment[];
};

export function isCurrentLegalConsent(value: unknown): value is LegalConsentAcceptance {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LegalConsentAcceptance>;
  if (candidate.version !== LEGAL_CONSENT_VERSION) return false;
  if (typeof candidate.acceptedAt !== 'string' || Number.isNaN(Date.parse(candidate.acceptedAt))) return false;
  if (!Array.isArray(candidate.acknowledgments)) return false;
  return candidate.acknowledgments.length === REQUIRED_LEGAL_ACKNOWLEDGMENTS.length
    && candidate.acknowledgments.every((item) => typeof item === 'string')
    && new Set(candidate.acknowledgments).size === REQUIRED_LEGAL_ACKNOWLEDGMENTS.length
    && REQUIRED_LEGAL_ACKNOWLEDGMENTS.every((item) => candidate.acknowledgments?.includes(item));
}

export function createLegalConsentAcceptance(now = new Date()): LegalConsentAcceptance {
  return {
    version: LEGAL_CONSENT_VERSION,
    acceptedAt: now.toISOString(),
    acknowledgments: [...REQUIRED_LEGAL_ACKNOWLEDGMENTS],
  };
}

export async function loadLegalConsent(): Promise<LegalConsentAcceptance | null> {
  const raw = await AsyncStorage.getItem(LEGAL_CONSENT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isCurrentLegalConsent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLegalConsent(acceptance: LegalConsentAcceptance): Promise<void> {
  if (!isCurrentLegalConsent(acceptance)) throw new Error('The legal agreement is incomplete.');
  await AsyncStorage.setItem(LEGAL_CONSENT_STORAGE_KEY, JSON.stringify(acceptance));
}

export async function clearLegalConsent(): Promise<void> {
  await AsyncStorage.removeItem(LEGAL_CONSENT_STORAGE_KEY);
}

export async function hasCurrentLegalConsent(): Promise<boolean> {
  return Boolean(await loadLegalConsent());
}
