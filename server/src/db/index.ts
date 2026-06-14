import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id          TEXT        PRIMARY KEY,
      provider    TEXT        NOT NULL,
      email       TEXT,
      display_name TEXT,
      password_hash TEXT,
      password_salt TEXT,
      apple_user_id TEXT,
      google_subject TEXT,
      premium     BOOLEAN     NOT NULL DEFAULT FALSE,
      seen_intro  BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email
      ON accounts (LOWER(email)) WHERE email IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_apple
      ON accounts (apple_user_id) WHERE apple_user_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_google
      ON accounts (google_subject) WHERE google_subject IS NOT NULL;
  `);
}
