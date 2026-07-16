import { Pool, PoolConfig } from 'pg';

const url = process.env.DATABASE_URL ?? '';

// Railway's private-network Postgres (*.railway.internal) and local Postgres
// speak plaintext. Forcing TLS there throws "The server does not support SSL
// connections" on every query, which previously crashed the process on the
// first auth request. Public/proxied Postgres still requires TLS. Allow an
// explicit override via PGSSLMODE=disable|require.
function resolveSsl(): PoolConfig['ssl'] {
  const mode = process.env.PGSSLMODE;
  if (mode === 'disable') return false;
  const ca = process.env.PGSSLROOTCERT?.replace(/\\n/g, '\n');
  if (mode === 'require') return { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
  if (!url || /localhost|127\.0\.0\.1|\.railway\.internal/.test(url)) return false;
  return { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
}

export const pool = new Pool({
  connectionString: url || undefined,
  ssl: resolveSsl(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// A pool-level error (idle client dropped, transient network blip) must never
// take down the whole server. Log it and let the next query reconnect.
pool.on('error', (err: Error) => {
  console.error('[DB] Idle client error:', err.message);
});

export async function initDb(): Promise<void> {
  const { runMigrations } = await import('./migrate');
  await runMigrations();
}
