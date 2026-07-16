import { pool } from './index';

export interface DbSession {
  id: string;
  account_id: string | null;
  mode: string;
  title: string;
  duration_seconds: number;
  words_spoken: number;
  coaching_count: number;
  score: number;
  rating: number;
  transcript_text: string;
  coaching_json: string;
  analysis_json: string | null;
  created_at: string;
}

export async function createSession(fields: {
  id: string;
  accountId: string | null;
  mode: string;
  title: string;
  durationSeconds: number;
  wordsSpoken: number;
  coachingCount: number;
  score: number;
  rating: number;
  transcriptText: string;
  coachingJson: string;
  analysisJson: string | null;
}): Promise<DbSession> {
  const { rows } = await pool.query<DbSession>(
    `INSERT INTO sessions
       (id, account_id, mode, title, duration_seconds, words_spoken, coaching_count,
        score, rating, transcript_text, coaching_json, analysis_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      fields.id, fields.accountId, fields.mode, fields.title,
      fields.durationSeconds, fields.wordsSpoken, fields.coachingCount,
      fields.score, fields.rating, fields.transcriptText,
      fields.coachingJson, fields.analysisJson,
    ]
  );
  return rows[0];
}

export async function listSessionsByAccount(accountId: string, limit = 50): Promise<DbSession[]> {
  const { rows } = await pool.query<DbSession>(
    `SELECT * FROM sessions WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [accountId, limit]
  );
  return rows;
}

export async function getSessionById(id: string): Promise<DbSession | null> {
  const { rows } = await pool.query<DbSession>(
    'SELECT * FROM sessions WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}

export async function recordCoachingUsage(fields: {
  sessionId: string;
  accountId: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
}): Promise<void> {
  await pool.query(
    `INSERT INTO coaching_usage
       (session_id, account_id, started_at, ended_at, duration_seconds)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (session_id) DO NOTHING`,
    [
      fields.sessionId,
      fields.accountId,
      fields.startedAt,
      fields.endedAt,
      Math.max(0, Math.ceil(fields.durationSeconds)),
    ]
  );
}

// Total server-observed WebSocket coaching time in the current calendar month
// (UTC). Client-supplied session summaries are deliberately not used for billing
// or quota enforcement.
export async function getMonthlyUsageSeconds(accountId: string): Promise<number> {
  const { rows } = await pool.query<{ total: string | null }>(
    `SELECT COALESCE(SUM(duration_seconds), 0)::text AS total
       FROM coaching_usage
      WHERE account_id = $1
        AND started_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`,
    [accountId]
  );
  return parseInt(rows[0]?.total ?? '0', 10);
}

export async function getSessionStats(accountId: string): Promise<{
  totalSessions: number;
  bestScore: number;
  streak: number;
}> {
  const { rows: agg } = await pool.query<{ total: string; best: string | null }>(
    `SELECT COUNT(*)::text AS total, MAX(score)::text AS best
     FROM sessions WHERE account_id = $1`,
    [accountId]
  );
  const totalSessions = parseInt(agg[0]?.total ?? '0', 10);
  const bestScore = parseInt(agg[0]?.best ?? '0', 10);

  const { rows: dates } = await pool.query<{ d: string }>(
    `SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC')::text AS d
     FROM sessions WHERE account_id = $1 ORDER BY d DESC`,
    [accountId]
  );

  let streak = 0;
  if (dates.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (dates[0].d === today || dates[0].d === yesterday) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1].d).getTime();
        const curr = new Date(dates[i].d).getTime();
        if (Math.round((prev - curr) / 86_400_000) === 1) streak++;
        else break;
      }
    }
  }

  return { totalSessions, bestScore, streak };
}
