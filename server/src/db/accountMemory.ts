import { pool } from './index';

export interface AccountMemory {
  interests: string[];
  personalDetails: string[];
  callbackTopics: string[];
  followUps: Array<{ timing: string; text: string; mode: string; sessionId: string; createdAt: string }>;
  recentSessionTitles: string[];
  recentModes: string[];
  lastSummary: string;
  lastUpdatedAt: string;
}

const EMPTY_MEMORY: AccountMemory = {
  interests: [],
  personalDetails: [],
  callbackTopics: [],
  followUps: [],
  recentSessionTitles: [],
  recentModes: [],
  lastSummary: '',
  lastUpdatedAt: new Date(0).toISOString(),
};

function parseMemory(raw: string | null): AccountMemory {
  if (!raw) return { ...EMPTY_MEMORY };
  try {
    const parsed = JSON.parse(raw) as Partial<AccountMemory>;
    return {
      interests: Array.isArray(parsed.interests) ? parsed.interests.filter((item): item is string => typeof item === 'string') : [],
      personalDetails: Array.isArray(parsed.personalDetails) ? parsed.personalDetails.filter((item): item is string => typeof item === 'string') : [],
      callbackTopics: Array.isArray(parsed.callbackTopics) ? parsed.callbackTopics.filter((item): item is string => typeof item === 'string') : [],
      followUps: Array.isArray(parsed.followUps)
        ? parsed.followUps.filter((item): item is AccountMemory['followUps'][number] =>
          Boolean(item)
          && typeof item.timing === 'string'
          && typeof item.text === 'string'
          && typeof item.mode === 'string'
          && typeof item.sessionId === 'string'
          && typeof item.createdAt === 'string')
        : [],
      recentSessionTitles: Array.isArray(parsed.recentSessionTitles) ? parsed.recentSessionTitles.filter((item): item is string => typeof item === 'string') : [],
      recentModes: Array.isArray(parsed.recentModes) ? parsed.recentModes.filter((item): item is string => typeof item === 'string') : [],
      lastSummary: typeof parsed.lastSummary === 'string' ? parsed.lastSummary : '',
      lastUpdatedAt: typeof parsed.lastUpdatedAt === 'string' ? parsed.lastUpdatedAt : new Date(0).toISOString(),
    };
  } catch {
    return { ...EMPTY_MEMORY };
  }
}

function dedupe(items: string[], limit = 8): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, limit);
}

function mergeFollowUps(
  current: AccountMemory['followUps'],
  next: AccountMemory['followUps'],
  limit = 12
): AccountMemory['followUps'] {
  const seen = new Set<string>();
  const merged: AccountMemory['followUps'] = [];
  for (const item of [...next, ...current]) {
    const key = `${item.mode}::${item.sessionId}::${item.timing}::${item.text}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

export async function getAccountMemory(accountId: string): Promise<AccountMemory> {
  const { rows } = await pool.query<{ memory_json: string | null }>(
    'SELECT memory_json FROM account_memory WHERE account_id = $1 LIMIT 1',
    [accountId]
  );
  return parseMemory(rows[0]?.memory_json ?? null);
}

export async function upsertAccountMemory(fields: {
  accountId: string;
  mode: string;
  sessionId: string;
  title: string;
  summary: string;
  interests?: string[];
  personalDetails?: string[];
  callbackTopics?: string[];
  followUps?: Array<{ timing: string; text: string }>;
}): Promise<AccountMemory> {
  const existing = await getAccountMemory(fields.accountId);
  const now = new Date().toISOString();
  const next: AccountMemory = {
    interests: dedupe([...(fields.interests ?? []), ...existing.interests], 12),
    personalDetails: dedupe([...(fields.personalDetails ?? []), ...existing.personalDetails], 12),
    callbackTopics: dedupe([...(fields.callbackTopics ?? []), ...existing.callbackTopics], 12),
    followUps: mergeFollowUps(
      existing.followUps,
      (fields.followUps ?? []).map((item) => ({
        timing: item.timing,
        text: item.text,
        mode: fields.mode,
        sessionId: fields.sessionId,
        createdAt: now,
      }))
    ),
    recentSessionTitles: dedupe([fields.title, ...existing.recentSessionTitles], 8),
    recentModes: dedupe([fields.mode, ...existing.recentModes], 6),
    lastSummary: fields.summary || existing.lastSummary,
    lastUpdatedAt: now,
  };

  await pool.query(
    `INSERT INTO account_memory (account_id, memory_json, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (account_id) DO UPDATE
       SET memory_json = EXCLUDED.memory_json,
           updated_at = NOW()`,
    [fields.accountId, JSON.stringify(next)]
  );

  return next;
}
