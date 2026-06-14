import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConversationMode, SessionRecap, TranscriptEntry, CoachingEntry } from '../types';

const KEY = 'wingman:sessionRecaps';
const MAX_RECAPS = 20;

function modeLabel(mode: ConversationMode): string {
  switch (mode) {
    case 'dating': return 'Dating recap';
    case 'networking': return 'Networking recap';
    case 'pitching': return 'Pitch recap';
    case 'hard_conversations': return 'Conversation recap';
    case 'sales':
    default: return 'Call recap';
  }
}

function buildSubtitle(mode: ConversationMode, coachingCount: number, wordsSelf: number): string {
  const tipText = coachingCount === 1 ? '1 coaching cue' : `${coachingCount} coaching cues`;
  const wordText = wordsSelf === 1 ? '1 word spoken' : `${wordsSelf} words spoken`;
  const modeText = mode === 'hard_conversations' ? 'hard conversation' : mode;
  return `${modeText} · ${tipText} · ${wordText}`;
}

export function buildSessionSummary(transcript: TranscriptEntry[], coachingHistory: CoachingEntry[]): string {
  const transcriptText = transcript
    .filter((entry) => entry.isFinal)
    .slice(-4)
    .map((entry) => entry.text.trim())
    .filter(Boolean)
    .join(' ');

  if (transcriptText) {
    return transcriptText.length > 320 ? `${transcriptText.slice(0, 317).trimEnd()}…` : transcriptText;
  }

  const coachingText = coachingHistory.slice(-3).map((entry) => entry.text.trim()).filter(Boolean).join(' ');
  if (coachingText) {
    return coachingText.length > 320 ? `${coachingText.slice(0, 317).trimEnd()}…` : coachingText;
  }

  return 'Session completed with no final transcript captured.';
}

export function buildHighlights(coachingHistory: CoachingEntry[]): string[] {
  return coachingHistory
    .slice(-4)
    .reverse()
    .map((entry) => entry.text.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function createSessionRecap(input: {
  mode: ConversationMode;
  title?: string;
  subtitle?: string;
  score: number;
  durationSeconds: number;
  coachingTips: number;
  wordsSelf: number;
  rating: number;
  summary: string;
  highlights: string[];
  strengths?: string[];
  improvements?: string[];
  followUps?: Array<{ timing: string; text: string }>;
  keyMoment?: string;
}): SessionRecap {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode: input.mode,
    title: input.title ?? modeLabel(input.mode),
    subtitle: input.subtitle ?? buildSubtitle(input.mode, input.coachingTips, input.wordsSelf),
    score: input.score,
    durationSeconds: input.durationSeconds,
    coachingTips: input.coachingTips,
    wordsSelf: input.wordsSelf,
    rating: input.rating,
    summary: input.summary,
    highlights: input.highlights,
    strengths: input.strengths ?? [],
    improvements: input.improvements ?? [],
    followUps: input.followUps ?? [],
    keyMoment: input.keyMoment ?? '',
    createdAt: new Date().toISOString(),
  };
}

export async function loadSessionRecaps(limit = MAX_RECAPS): Promise<SessionRecap[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionRecap[];
    return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export async function saveSessionRecap(recap: SessionRecap): Promise<SessionRecap[]> {
  try {
    const existing = await loadSessionRecaps(MAX_RECAPS - 1);
    const next = [recap, ...existing].slice(0, MAX_RECAPS);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return [recap];
  }
}
