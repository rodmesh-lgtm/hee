# Production migration rollback

This runbook is for a failed or unsafe production database migration only. It does not authorize a production migration or a restore by itself.

## Preconditions

- Treat rollback as an incident. Stop application writes before touching the production database.
- Disable paid checkout and set `BILLING_OPERATIONS_READY=false` before restoring.
- Stop the billing scheduler/worker and any other background writer.
- Confirm there is no active `Production Database Migrations` workflow. The workflow is serialized with the `production-database-migrations` concurrency group.
- Identify the exact release SHA that ran the migration.
- Download only the encrypted artifact named `hee-production-pre-migration-<SHA>` created by that same migration run.
- Obtain `PRODUCTION_BACKUP_PASSPHRASE` through the production secret-management path. Never paste it into tickets, chat, shell history, or logs.

## Prove the recovery artifact before production restore

1. Decrypt the artifact to a local temporary file using the same AES-256-CBC/PBKDF2 parameters used by the workflow.
2. Require a non-empty decrypted dump.
3. Run `pg_restore --list` against the decrypted dump and fail if it cannot be parsed.
4. Restore the dump first into the isolated `hee_restore*` database, never directly into production.
5. Run `npm run backup:production-proof` with `SOURCE_DATABASE_URL` pointing at the pre-restore production database and `RESTORE_DATABASE_URL` pointing at the isolated restore database when the source is still readable. If the production database is not trustworthy enough to compare, require operator review of the isolated restore and the migration history before proceeding.
6. Confirm `_prisma_migrations` in the isolated restore has the expected clean pre-migration history and no rolled-back/incomplete rows.

## Restore production

Do not restore while the web application or workers can write.

1. Put the application into maintenance/offline mode at the reverse proxy or service layer.
2. Stop the web service and all background jobs that use the production database.
3. Take an additional incident snapshot/backup of the current failed post-migration state for forensic recovery. Do not overwrite the known-good pre-migration artifact.
4. Confirm the destination URL is the production database and is not any `hee_restore*` or CI database.
5. Restore the exact proven pre-migration dump using PostgreSQL restore tooling appropriate to the provider. Use `--no-owner --no-privileges`; destructive cleanup of the destination must be explicitly reviewed by the operator before execution.
6. Run `npx prisma migrate status` against the restored production database and confirm it reflects the pre-migration release state.
7. Run the production-safe integrity audits required by the release runbook before re-enabling traffic.

## Re-enable service

- Deploy the matching pre-migration application release SHA. Do not run the failed migration again during rollback recovery.
- Start the web service with paid checkout still closed.
- Start the billing scheduler only after the application is stable.
- Run a complete `npm run billing:renew` cycle and then a standalone `npm run billing:state-audit` before setting `BILLING_OPERATIONS_READY=true` again.
- Re-enable normal traffic only after health checks, customer data checks, billing integrity, and the incident owner all pass.

## Never do these

- Never use `prisma db push` on production.
- Never restore an artifact from a different SHA because it is "close enough".
- Never perform the restore while application or worker writes are active.
- Never automatically roll back a database from GitHub Actions after a failed migration. A failed migration must stop and require explicit incident handling.
- Never delete the failed post-migration snapshot until the incident is closed.
