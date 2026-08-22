# HEE billing on Hetzner VPS

The Moyasar integration is intentionally infrastructure-neutral. Billing uses HTTPS REST calls, PostgreSQL, environment variables and a standalone operations command. No billing code depends on Vercel APIs, Vercel Cron or Vercel storage.

## Production prerequisites

- `APP_ENV=production`
- `APP_URL=https://hee.sa`
- `AUTH_ORIGIN=https://hee.sa`
- `NEXT_PUBLIC_APP_URL=https://hee.sa`
- `PAYMENT_PROVIDER=moyasar`
- Moyasar live publishable and secret API keys
- a strong Moyasar webhook shared secret
- a 32-byte base64 `BILLING_TOKEN_ENCRYPTION_KEY`
- `BILLING_RENEWAL_ENABLED=true` only after a controlled renewal rehearsal is verified
- `BILLING_OPERATIONS_READY=true` only after the scheduled billing command has been installed and observed completing successfully
- PostgreSQL backups and tested restore procedure
- HTTPS/TLS for `hee.sa`

Run `npm run launch:config-audit` before enabling paid production traffic. Do not set `BILLING_OPERATIONS_READY=true` merely because the code was deployed; it is an operational attestation that the recurring job is installed, can reach PostgreSQL and Moyasar, and is producing observable successful runs.

## Moyasar webhook

Configure exactly this HTTPS endpoint in the Moyasar dashboard:

`https://hee.sa/api/billing/moyasar/webhook`

Use a strong `shared_secret` and configure the same value as `MOYASAR_WEBHOOK_SECRET`. Subscribe to payment lifecycle events used by HEE. HEE validates the shared secret and live/test environment before acknowledging payment events. Accepted events are first written to a durable PostgreSQL inbox, then processed asynchronously. Processing re-fetches each payment from Moyasar with the secret API key and checks amount, currency and HEE metadata before changing an entitlement. The recovery worker retries unprocessed inbox rows after transient runtime/provider failures.

## Billing operations worker on Hetzner

The operations command is a normal Node process and can run from a systemd timer or cron. It deliberately performs three phases in order:

1. recover durable Moyasar webhook inbox events;
2. reconcile/renew eligible subscriptions;
3. run the billing state drift audit after reconciliation.

Example cron cadence after deployment:

```cron
*/30 * * * * cd /srv/hee/apps/web && /usr/bin/npm run billing:renew >> /var/log/hee-billing-renewal.log 2>&1
```

Use the same deployed release and EnvironmentFile as the web application. Do not place secrets in the crontab. Prefer an EnvironmentFile readable only by the service account. Ensure NTP/time synchronization is enabled because subscription periods and retry timing are time-sensitive.

Run only one scheduled worker per production database. Database/advisory locking and uniqueness constraints protect critical renewal transitions, but operations should still avoid intentionally launching concurrent schedulers.

Treat a non-zero exit from `npm run billing:renew` as an operational alert. In particular, `billing:state-audit` intentionally fails when it detects plan-price drift, expired paid entitlements still marked live, inconsistent plan/subscription lineage, missing payment methods for auto-renew, invalid receipt snapshots, exhausted webhook retries or stuck webhook processing leases. Paid checkout must not remain enabled if this scheduler is not being observed successfully.

## Network and secrets

Allow outbound HTTPS to `api.moyasar.com`. The public reverse proxy needs inbound 443 only (plus controlled SSH administration). Keep PostgreSQL and Redis private, bind them to localhost/private networking, and do not expose database ports publicly. Store live API keys and the token-encryption key outside Git. Restrict `.env`/EnvironmentFile permissions to the application service user.

## Migration sequence

1. Take and verify a PostgreSQL backup.
2. Deploy application code without switching DNS if doing the initial Vercel-to-Hetzner migration.
3. Run `npx prisma migrate deploy` exactly once against the intended production database.
4. Start the web service behind HTTPS and test health/auth/public reads while paid checkout remains closed.
5. Verify the Moyasar webhook reaches the new host and that an authenticated sandbox/test event is durably accepted before changing production traffic.
6. Install the billing operations schedule with `BILLING_RENEWAL_ENABLED=true` but keep `BILLING_OPERATIONS_READY=false` until the controlled rehearsal is complete.
7. Verify one controlled subscription purchase, callback, durable webhook processing, entitlement activation, cancellation and one controlled renewal/reconciliation path.
8. Observe successful scheduled `npm run billing:renew` execution and inspect its logs plus `npm run billing:state-audit` result.
9. Set `BILLING_OPERATIONS_READY=true`, restart the application, then run `npm run launch:config-audit`.
10. Only after that audit passes should paid production checkout be enabled for general traffic.

Never use `prisma db push` for production deployment. Never make schema changes from two application hosts at the same time.

## Incident controls

To stop new paid checkouts without touching customer data, set `PAYMENT_PROVIDER` away from `moyasar` or set `BILLING_OPERATIONS_READY=false`, then restart the application. To stop automatic renewals while keeping existing paid periods intact, set `BILLING_RENEWAL_ENABLED=false` and stop the timer/cron. Preserve payment ledger, subscriptions, checkout-consent evidence and webhook inbox rows during an incident; reconcile them instead of deleting financial history.
