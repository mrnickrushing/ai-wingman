CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  password_hash TEXT,
  password_salt TEXT,
  apple_user_id TEXT,
  google_subject TEXT,
  premium BOOLEAN NOT NULL DEFAULT FALSE,
  seen_intro BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email
  ON accounts (LOWER(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_apple
  ON accounts (apple_user_id) WHERE apple_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_google
  ON accounts (google_subject) WHERE google_subject IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  duration_seconds INT NOT NULL DEFAULT 0,
  words_spoken INT NOT NULL DEFAULT 0,
  coaching_count INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  rating INT NOT NULL DEFAULT 0,
  transcript_text TEXT NOT NULL DEFAULT '',
  coaching_json TEXT NOT NULL DEFAULT '[]',
  analysis_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_account
  ON sessions (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS account_memory (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  memory_json TEXT NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
