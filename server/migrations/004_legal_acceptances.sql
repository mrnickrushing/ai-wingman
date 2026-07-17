CREATE TABLE IF NOT EXISTS legal_acceptances (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  agreement_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_accepted_at TIMESTAMPTZ NOT NULL,
  acknowledgments_json JSONB NOT NULL,
  PRIMARY KEY (account_id, agreement_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_accepted_at
  ON legal_acceptances (accepted_at DESC);
