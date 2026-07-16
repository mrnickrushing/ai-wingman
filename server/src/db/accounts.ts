import { pool } from './index';

export interface DbAccount {
  id: string;
  provider: 'email' | 'apple' | 'google';
  email: string | null;
  display_name: string | null;
  password_hash: string | null;
  password_salt: string | null;
  apple_user_id: string | null;
  google_subject: string | null;
  premium: boolean;
  subscription_status: string;
  subscription_entitlement: string | null;
  subscription_product_id: string | null;
  subscription_period_type: string | null;
  subscription_store: string | null;
  subscription_environment: string | null;
  subscription_expires_at: string | null;
  subscription_last_verified_at: string | null;
  subscription_last_event_id: string | null;
  seen_intro: boolean;
  created_at: string;
  updated_at: string;
}

export function hasActivePremium(account: DbAccount): boolean {
  if (!account.premium || !account.subscription_last_verified_at) return false;
  if (!['active', 'trial', 'grace_period'].includes(account.subscription_status)) return false;
  if (!account.subscription_expires_at) return true;
  return new Date(account.subscription_expires_at).getTime() > Date.now();
}

export async function findByEmail(email: string): Promise<DbAccount | null> {
  const { rows } = await pool.query<DbAccount>(
    'SELECT * FROM accounts WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  return rows[0] ?? null;
}

export async function findByAppleId(appleUserId: string): Promise<DbAccount | null> {
  const { rows } = await pool.query<DbAccount>(
    'SELECT * FROM accounts WHERE apple_user_id = $1 LIMIT 1',
    [appleUserId]
  );
  return rows[0] ?? null;
}

export async function findByGoogleSubject(subject: string): Promise<DbAccount | null> {
  const { rows } = await pool.query<DbAccount>(
    'SELECT * FROM accounts WHERE google_subject = $1 LIMIT 1',
    [subject]
  );
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<DbAccount | null> {
  const { rows } = await pool.query<DbAccount>(
    'SELECT * FROM accounts WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}

// ── Admin reporting (no secrets) ─────────────────────────────────────────────

export interface AdminAccountRow {
  id: string;
  provider: string;
  email: string | null;
  display_name: string | null;
  premium: boolean;
  created_at: string;
}

export async function countAccounts(): Promise<{ total: number; premium: number }> {
  const { rows } = await pool.query<{ total: string; premium: string }>(
    `SELECT COUNT(*)::text AS total,
            COUNT(*) FILTER (
              WHERE premium
                AND subscription_last_verified_at IS NOT NULL
                AND subscription_status IN ('active', 'trial', 'grace_period')
                AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
            )::text AS premium
       FROM accounts`
  );
  return {
    total: parseInt(rows[0]?.total ?? '0', 10),
    premium: parseInt(rows[0]?.premium ?? '0', 10),
  };
}

export async function listAccounts(limit = 200): Promise<AdminAccountRow[]> {
  const { rows } = await pool.query<AdminAccountRow>(
    `SELECT id, provider, email, display_name,
            (premium
              AND subscription_last_verified_at IS NOT NULL
              AND subscription_status IN ('active', 'trial', 'grace_period')
              AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
            ) AS premium,
            created_at
       FROM accounts
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function createAccount(fields: {
  id: string;
  provider: DbAccount['provider'];
  email?: string;
  displayName?: string;
  passwordHash?: string;
  passwordSalt?: string;
  appleUserId?: string;
  googleSubject?: string;
}): Promise<DbAccount> {
  const { rows } = await pool.query<DbAccount>(
    `INSERT INTO accounts
       (id, provider, email, display_name, password_hash, password_salt, apple_user_id, google_subject)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      fields.id,
      fields.provider,
      fields.email ?? null,
      fields.displayName ?? null,
      fields.passwordHash ?? null,
      fields.passwordSalt ?? null,
      fields.appleUserId ?? null,
      fields.googleSubject ?? null,
    ]
  );
  return rows[0];
}

export async function updateAccount(
  id: string,
  fields: Partial<{
    email: string;
    displayName: string;
    premium: boolean;
    seenIntro: boolean;
    passwordHash: string;
    passwordSalt: string;
  }>
): Promise<DbAccount | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let i = 1;

  if (fields.email !== undefined)       { sets.push(`email = $${i++}`);         values.push(fields.email); }
  if (fields.displayName !== undefined) { sets.push(`display_name = $${i++}`);  values.push(fields.displayName); }
  if (fields.premium !== undefined)     { sets.push(`premium = $${i++}`);        values.push(fields.premium); }
  if (fields.seenIntro !== undefined)   { sets.push(`seen_intro = $${i++}`);     values.push(fields.seenIntro); }
  if (fields.passwordHash !== undefined){ sets.push(`password_hash = $${i++}`);  values.push(fields.passwordHash); }
  if (fields.passwordSalt !== undefined){ sets.push(`password_salt = $${i++}`);  values.push(fields.passwordSalt); }

  values.push(id);
  const { rows } = await pool.query<DbAccount>(
    `UPDATE accounts SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export type SubscriptionState = {
  active: boolean;
  status: 'active' | 'trial' | 'grace_period' | 'expired' | 'inactive';
  entitlement: string;
  productId: string | null;
  periodType: string | null;
  store: string | null;
  environment: string | null;
  expiresAt: string | null;
  eventId?: string | null;
};

export async function updateSubscriptionState(
  id: string,
  state: SubscriptionState
): Promise<DbAccount | null> {
  const { rows } = await pool.query<DbAccount>(
    `UPDATE accounts
        SET premium = $2,
            subscription_status = $3,
            subscription_entitlement = $4,
            subscription_product_id = $5,
            subscription_period_type = $6,
            subscription_store = $7,
            subscription_environment = $8,
            subscription_expires_at = $9,
            subscription_last_verified_at = NOW(),
            subscription_last_event_id = COALESCE($10, subscription_last_event_id),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [
      id,
      state.active,
      state.status,
      state.entitlement,
      state.productId,
      state.periodType,
      state.store,
      state.environment,
      state.expiresAt,
      state.eventId ?? null,
    ]
  );
  return rows[0] ?? null;
}

export async function recordSubscriptionEvent(fields: {
  id: string;
  accountId: string | null;
  type: string;
  environment: string | null;
  eventTimestampMs: number | null;
}): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO subscription_events
       (id, account_id, event_type, environment, event_timestamp_ms)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [fields.id, fields.accountId, fields.type, fields.environment, fields.eventTimestampMs]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteAccount(id: string): Promise<void> {
  await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
}
