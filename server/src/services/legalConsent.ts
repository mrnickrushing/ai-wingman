export const CURRENT_LEGAL_AGREEMENT_VERSION = '2026-07-17';

export const REQUIRED_LEGAL_ACKNOWLEDGMENTS = [
  'ai-limitations',
  'participant-consent',
  'audio-and-transcripts',
  'terms-and-privacy',
] as const;

type LegalAcceptanceInput = {
  version?: unknown;
  acceptedAt?: unknown;
  acknowledgments?: unknown;
};

export function isValidLegalAcceptance(
  input: LegalAcceptanceInput,
  nowMs = Date.now()
): input is { version: string; acceptedAt: string; acknowledgments: string[] } {
  if (input.version !== CURRENT_LEGAL_AGREEMENT_VERSION) return false;
  if (typeof input.acceptedAt !== 'string') return false;

  const acceptedAtMs = Date.parse(input.acceptedAt);
  if (!Number.isFinite(acceptedAtMs) || acceptedAtMs > nowMs + 5 * 60 * 1000) return false;
  if (!Array.isArray(input.acknowledgments)) return false;

  const acknowledgments = input.acknowledgments;
  return acknowledgments.length === REQUIRED_LEGAL_ACKNOWLEDGMENTS.length
    && acknowledgments.every((item): item is string => typeof item === 'string')
    && new Set(acknowledgments).size === REQUIRED_LEGAL_ACKNOWLEDGMENTS.length
    && REQUIRED_LEGAL_ACKNOWLEDGMENTS.every((item) => acknowledgments.includes(item));
}
