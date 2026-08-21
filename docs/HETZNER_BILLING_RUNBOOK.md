# HEE billing on Hetzner VPS

The Moyasar integration is intentionally infrastructure-neutral. Billing uses HTTPS REST calls, PostgreSQL, environment variables and a standalone renewal command. No billing code depends on Vercel APIs, Vercel Cron or Vercel storage.

## Production prerequisites

- `APP_ENV=production`
- `APP_URL=https://hee.sa`
- `AUTH_ORIGIN=https://hee.sa`
- `NEXT_PUBLIC_APP_URL=https://hee.sa`
- `PAYMENT_PROVIDER=moyasar`
- Moyasar live publishable and secret API keys
- a strong Moyasar webhook shared secret
- a 32-byte base64 `BILLING_TOKEN_ENCRYPTION_KEY`
- `BILLING_RENEWAL_ENABLED=true` only after a real live/sandbox renewal rehearsal is verified
- PostgreSQL backups and tested restore procedure
- HTTPS/TLS for `hee.sa`

Run `npm run launch:config-audit` before enabling paid production traffic.

## Moyasar webhook

Configure exactly this HTTPS endpoint in the Moyasar dashboard:

`https://hee.sa/api/billing/moyasar/webhook`

Use a strong `shared_secret` and configure the same value as `MOYASAR_WEBHOOK_SECRET`. Subscribe to payment lifecycle events used by HEE. HEE deduplicates webhook event IDs, validates the shared secret, rejects test/live environment mismatches, re-fetches each payment from Moyasar with the secret API key and checks amount, currency and HEE metadata before changing an entitlement.

## Renewal worker on Hetzner

The worker is a normal Node process and can run from systemd timer or cron. Example cron cadence after deployment:

```cron
*/30 * * * * cd /srv/hee/apps/web && /usr/bin/npm run billing:renew >> /var/log/hee-billing-renewal.log 2>&1
```

Use the same deployed release and `.env` as the web application. Do not place secrets in the crontab. Prefer an EnvironmentFile readable only by the service account. Ensure NTP/time synchronization is enabled because subscription periods and retry timing are time-sensitive.

Run only one scheduled worker per production database. Database uniqueness constraints protect renewal attempt numbers, but operations should still avoid intentionally launching concurrent schedulers.

## Network and secrets

Allow outbound HTTPS to `api.moyasar.com`. The public reverse proxy needs inbound 443 only (plus controlled SSH administration). Keep PostgreSQL and Redis private, bind them to localhost/private networking, and do not expose database ports publicly. Store live API keys and the token-encryption key outside Git. Restrict `.env`/EnvironmentFile permissions to the application service user.

## Migration sequence

1. Take and verify a PostgreSQL backup.
2. Deploy application code without switching DNS if doing the initial Vercel-to-Hetzner migration.
3. Run `npx prisma migrate deploy` exactly once against the intended production database.
4. Run `npm run launch:config-audit`.
5. Start the web service behind HTTPS and test health/auth/public reads.
6. Verify the Moyasar webhook reaches the new host and returns 2xx for a sandbox/test event before changing production traffic.
7. Verify one controlled subscription purchase, callback, webhook, entitlement activation and cancellation path.
8. Enable the renewal scheduler only after the controlled renewal rehearsal passes.

Never use `prisma db push` for production deployment. Never make schema changes from two application hosts at the same time.

## Incident controls

To stop new paid checkouts without touching customer data, set `PAYMENT_PROVIDER` away from `moyasar` and restart the application. To stop automatic renewals while keeping existing paid periods intact, set `BILLING_RENEWAL_ENABLED=false` and stop the timer/cron. Do not delete payment ledger or subscription rows during an incident; preserve them for reconciliation and support.
