import 'dotenv/config';
import { pool } from './index';
import { runMigrations } from './migrate';

runMigrations()
  .then(() => console.log('[DB] Migrations complete'))
  .finally(() => pool.end())
  .catch((error) => {
    console.error('[DB] Migration failed:', error);
    process.exitCode = 1;
  });
