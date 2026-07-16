# PostgreSQL backup and restore runbook

Production data must have two independent recovery paths: Railway-native
point-in-time recovery (PITR) and a periodic logical `pg_dump` stored outside
Railway.

## Required production configuration

1. In the Railway Postgres service, open **Backups** and enable PITR. Confirm the
   first base backup completes and a restore window is displayed.
2. Also enable daily, weekly, and monthly volume backups. Lock a known-good
   backup before risky migrations or bulk data changes.
3. Run a nightly custom-format logical backup from a restricted CI/operations
   environment and upload it to encrypted object storage with retention and
   access logging:

   ```sh
   pg_dump --format=custom --no-owner --no-acl "$DATABASE_PUBLIC_URL" --file ai-wingman.dump
   pg_restore --list ai-wingman.dump
   ```

   Never commit dumps or database URLs to the repository.

## Restore procedure

For accidental writes or a bad migration, use Railway PITR to create a sibling
Postgres service at the timestamp immediately before the incident. Validate row
counts and application smoke tests against the sibling before changing the app's
`DATABASE_URL`. The source database should remain untouched until validation is
complete.

For a logical dump, create an empty recovery database and restore into it:

```sh
createdb "$RECOVERY_DATABASE_URL"
pg_restore --exit-on-error --no-owner --no-acl --dbname "$RECOVERY_DATABASE_URL" ai-wingman.dump
```

Run `npm run migrate` from `server/`, then verify `/health`, account sign-in,
subscription state, session history, and memory reads before cutover.

## Operating cadence

- Test a restore into an isolated database at least quarterly.
- Record restore time, dump integrity, migration result, and smoke-test result.
- Take and lock a manual backup before every destructive migration.
- Rotate backup credentials and review restore access at least twice a year.
- Do not treat an untested backup as recoverable.
