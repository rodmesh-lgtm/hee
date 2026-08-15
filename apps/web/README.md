# HEE Web

Arabic-first Next.js application for HEE business pages, dashboard management, public orders/bookings, analytics, authentication, and persistent media.

## Local setup

1. Copy the repository root `.env.example` values into your local environment and replace secrets.
2. Install dependencies:

```bash
npm ci
```

3. Generate the Prisma client and apply the appropriate development migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

4. Start the app:

```bash
npm run dev
```

The local application runs on `http://localhost:3000` by default.

## Release quality gate

The `hee-v6-rc` GitHub Actions workflow is the release gate. A release candidate is not considered ready unless these commands pass:

```bash
npm audit --omit=dev --audit-level=high
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run test:unit
npm run build
```

Do not bypass a failing gate for production deployment.

## Persistent storage

Application uploads use the storage adapter in `app/lib/storage.ts` and canonical public URLs under `/api/storage/<id>`.

- `STORAGE_DRIVER=database` stores bytes in PostgreSQL and is the safe default.
- `STORAGE_DRIVER=s3` stores object bytes in an S3-compatible backend while PostgreSQL keeps metadata.
- File replacement/deletion must use the storage lifecycle helpers so old persistent objects are removed only after the database update succeeds.
- Run `npm run storage:audit` before any orphan cleanup.
- Destructive cleanup requires both `npm run storage:sweep` and `ALLOW_STORAGE_ORPHAN_DELETE=true`; review the dry-run first.

When switching production to S3-compatible storage, configure and test the endpoint/bucket credentials before changing `STORAGE_DRIVER`. Existing database-backed objects remain readable because each stored object records its own driver.

## QA preview access

QA fixture and audit endpoints are preview-only. Configure `QA_AUDIT_SECRET` and `QA_AUDIT_USER_EMAIL` only in the preview environment. Destructive QA fixture routes must never be exposed in production.

## Production deployment checklist

Before production:

1. Verify the RC Quality workflow is green on the exact commit being deployed.
2. Review pending Prisma migrations and back up the production database.
3. Apply migrations using the production migration procedure; do not run development migrations in production.
4. Verify required secrets and OAuth callback configuration.
5. Verify `APP_URL`/canonical domain settings use `https://hee.sa`.
6. Keep `ALLOW_STORAGE_ORPHAN_DELETE=false` during ordinary runtime.
7. If enabling S3, test upload, read, replacement, deletion, and orphan audit against the production-compatible bucket before cutover.
8. Smoke-test login/register, page publishing, public page rendering, orders, bookings, media, and dashboard flows after deployment.

## Useful scripts

```bash
npm run test:unit
npm run test:security-sql
npm run test:smoke
npm run test:launch-security
npm run storage:audit
npm run storage:sweep
npm run qa:handoff
```
