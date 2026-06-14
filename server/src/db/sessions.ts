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
