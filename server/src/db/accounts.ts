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
  seen_intro: boolean;
  created_at: string;
  updated_at: string;
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

export async function deleteAccount(id: string): Promise<void> {
  await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
}
