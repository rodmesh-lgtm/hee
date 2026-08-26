# HEE Web

Arabic-first Next.js application for HEE digital business identities, customer dashboards, analytics, authentication, subscriptions, and persistent media.

The current public renderer is **V10 Light**. Public business pages are digital business identities, not storefronts. Product/order models are intentionally retained for a future HEE partner store, and booking models are intentionally retained for optional appointment booking for businesses that need it.

## Local setup

1. Configure the required environment variables, especially `DATABASE_URL`.
2. Install dependencies:

```bash
npm ci
```

3. Generate Prisma and apply development migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

4. Start the app:

```bash
npm run dev
```

## Release quality gate

The `hee-v6-rc` GitHub Actions workflow is the baseline release gate. A release candidate is not ready unless the exact commit passes:

```bash
npm audit --omit=dev --audit-level=high
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run test:unit
npm run build
```

Vercel Build success is required as well, but it is not a substitute for the RC gate or browser testing.

Before production, run the owner/browser workflows separately against the release candidate:

```bash
npm run test:rc
npm run test:directory
```

Do not use `vercel --prod` until the release candidate has been approved.

## Database and migrations

- Production runtime requires a valid PostgreSQL `DATABASE_URL`; there is no production fallback database.
- Review and back up production before applying migrations.
- Apply production migrations with the production migration procedure (`prisma migrate deploy`), never `prisma migrate dev`.
- `RequestRateLimit` is migration-managed. Request traffic must not create database tables or indexes at runtime.
- Canonical plans are seeded by `npm run prisma db seed`; demo data is created only when `SEED_DEMO_BUSINESS=true` outside production.

## Persistent storage

Uploads use `app/lib/storage.ts` and canonical public URLs under `/api/storage/<id>`.

- `STORAGE_DRIVER=database` stores bytes in PostgreSQL.
- `STORAGE_DRIVER=s3` uses an S3-compatible backend while PostgreSQL keeps metadata.
- Replacement/deletion must use storage lifecycle helpers.
- Run `npm run storage:audit` before cleanup.
- Destructive cleanup requires `npm run storage:sweep` together with `ALLOW_STORAGE_ORPHAN_DELETE=true` after reviewing the dry run.

## QA preview access

QA audit access is preview-only and read-only. Configure `QA_AUDIT_SECRET` and `QA_AUDIT_USER_EMAIL` only in Vercel Preview. QA sessions must never gain admin or write privileges.

## Production checklist

1. Confirm the exact commit is on `hee-v6-rc` and Vercel Build is green.
2. Confirm GitHub RC Quality is green.
3. Back up the production database and apply pending migrations.
4. Verify `DATABASE_URL`, OAuth credentials/callbacks, email/reset configuration, storage configuration, and `HEE_ADMIN_EMAILS`.
5. Verify the canonical production domain is `https://ir.sa`.
6. Run `npm run storage:audit` and review orphaned files.
7. Smoke-test register/login/logout/password reset/OAuth.
8. Smoke-test onboarding, autosave, preview, publish/unpublish, branding images, services, branches/team, verification requests, upgrades, analytics, and public V10 rendering.
9. Run `npm run test:rc` and `npm run test:directory` against the release candidate.
10. Only after approval, deploy production.

## Current scripts

```bash
npm run dev
npm run build
npm run lint
npm run test:unit
npm run test:rc
npm run test:directory
npm run storage:audit
npm run storage:sweep
npm run qa:handoff
```

## Canonical publication request

The 2026-08-26 release is approved for guarded publication to `https://ir.sa` through the repository Production Canonical Cutover Orchestrator. Production Environment secrets were re-entered under the workflow-owned `PRODUCTION_*` names before this publication attempt. This note is documentation-only and exists to place the explicit production-cutover marker on an RC-observed path.
