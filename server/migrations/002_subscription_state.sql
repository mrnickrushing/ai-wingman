ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_entitlement TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_product_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_period_type TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_store TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_environment TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_last_verified_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS subscription_last_event_id TEXT;

-- Legacy premium booleans were client-writable and cannot be trusted. Every
-- legitimate subscriber is restored by the RevenueCat sync endpoint/webhook.
UPDATE accounts
SET premium = FALSE,
    subscription_status = 'unverified'
WHERE subscription_last_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  environment TEXT,
  event_timestamp_ms BIGINT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_account
  ON subscription_events (account_id, received_at DESC);
