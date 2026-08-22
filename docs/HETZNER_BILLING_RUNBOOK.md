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
- `BILLING_RENEWAL_ENABLED=true` only after the production worker is intentionally installed
- `BILLING_OPERATIONS_READY=true` only after the scheduled billing command has been installed and a complete cycle has succeeded
- `PAID_CHECKOUT_PUBLIC_ENABLED=false` throughout the controlled live rehearsal
- `BILLING_REHEARSAL_USER_EMAIL=<verified operator-controlled account>` only for the short rehearsal window
- PostgreSQL backups and tested restore procedure
- HTTPS/TLS for `hee.sa`

The flags deliberately represent different facts. `BILLING_OPERATIONS_READY` means recovery/renewal operations are healthy. `PAID_CHECKOUT_PUBLIC_ENABLED` means new paid checkout intents are open to every eligible customer. Do not use one as a substitute for the other.

## Moyasar webhook

Configure exactly this HTTPS endpoint in the Moyasar dashboard:

`https://hee.sa/api/billing/moyasar/webhook`

Use a strong `shared_secret` and configure the same value as `MOYASAR_WEBHOOK_SECRET`. Subscribe to payment lifecycle events used by HEE. HEE validates the shared secret and live/test environment before acknowledging payment events. Accepted events are first written to a durable PostgreSQL inbox, then processed asynchronously. Processing re-fetches each payment from Moyasar with the secret API key and checks amount, currency and HEE metadata before changing an entitlement. The recovery worker retries unprocessed inbox rows after transient runtime/provider failures.

## Billing operations worker on Hetzner

The operations command is a normal Node process and deliberately performs three phases in order:

1. recover durable Moyasar webhook inbox events;
2. reconcile/renew eligible subscriptions;
3. run the billing state drift audit after reconciliation and record a durable successful-run heartbeat.

The production scheduler is versioned in the repository:

- `ops/systemd/hee-billing-renew.service`
- `ops/systemd/hee-billing-renew.timer`

The timer runs every 30 minutes and the service is `Type=oneshot`, which prevents a second systemd activation from starting while the current invocation is still active. The service reads secrets only from `/etc/hee/production.env` and sends logs to journald.

### Install or update the versioned systemd units

Run as an administrator on the worker host after the exact production release has been checked out at `/srv/hee`:

```bash
install -o root -g root -m 0644 /srv/hee/ops/systemd/hee-billing-renew.service /etc/systemd/system/hee-billing-renew.service
install -o root -g root -m 0644 /srv/hee/ops/systemd/hee-billing-renew.timer /etc/systemd/system/hee-billing-renew.timer
install -d -o root -g hee -m 0750 /etc/hee
# Create /etc/hee/production.env through the production secret-management path.
# Never copy secrets into this repository or the systemd unit files.
chown root:hee /etc/hee/production.env
chmod 0640 /etc/hee/production.env
systemctl daemon-reload
systemctl enable --now hee-billing-renew.timer
systemctl list-timers hee-billing-renew.timer
```

Before marking billing operations ready, execute one controlled cycle and inspect it:

```bash
systemctl start hee-billing-renew.service
systemctl status hee-billing-renew.service --no-pager
journalctl -u hee-billing-renew.service -n 200 --no-pager
systemctl list-timers hee-billing-renew.timer --no-pager
```

Do not use both cron and the systemd timer. Exactly one scheduler should own the production database. Database/advisory locking and uniqueness constraints protect critical renewal transitions, but operations should still avoid intentionally launching concurrent schedulers.

Treat a non-zero exit from `npm run billing:renew` as an operational alert. In particular, webhook recovery exits non-zero when an event must be retried, and `billing:state-audit` fails when it detects plan-price drift, expired paid entitlements still marked live, inconsistent plan/subscription lineage, missing payment methods for auto-renew, invalid receipt snapshots, exhausted webhook retries or stuck webhook processing leases. The heartbeat is written only after all three phases complete successfully.

With `BILLING_OPERATIONS_READY=true`, a standalone `npm run billing:state-audit` also verifies that the last successful heartbeat is no older than 90 minutes. Because the scheduler runs every 30 minutes, this permits one delayed/missed run while still detecting a stopped scheduler. A stale or missing heartbeat is a paid-checkout incident: set `BILLING_OPERATIONS_READY=false` and `PAID_CHECKOUT_PUBLIC_ENABLED=false`, restart the web application, investigate the scheduler, and do not re-enable readiness until a complete `npm run billing:renew` succeeds and a following standalone state audit passes.

## Controlled live subscription rehearsal

The live rehearsal must not require opening payment to all customers.

1. Set `PAID_CHECKOUT_PUBLIC_ENABLED=false`.
2. Set `BILLING_REHEARSAL_USER_EMAIL` to one operator-controlled, verified HEE account only.
3. Ensure `BILLING_RENEWAL_ENABLED=true` and run one successful `hee-billing-renew.service` cycle.
4. After the heartbeat is fresh, set `BILLING_OPERATIONS_READY=true` and restart/redeploy the production runtime. Only the configured rehearsal account can now create a new paid checkout intent.
5. From that account, execute exactly one authorized live subscription rehearsal and verify callback, durable webhook inbox, provider re-fetch, entitlement activation, receipt snapshot, cancellation, and the intended renewal/reconciliation behavior.
6. Confirm the payment ledger and subscription state with `npm run billing:state-audit` and inspect the worker logs.
7. Remove `BILLING_REHEARSAL_USER_EMAIL` completely.
8. Only after the rehearsal is accepted, set `PAID_CHECKOUT_PUBLIC_ENABLED=true` and restart/redeploy the runtime.
9. The final `npm run launch:config-audit` and `Production Launch Readiness` workflow intentionally fail if the public switch is not true or if the rehearsal email remains configured.

Existing provider-started payment intents remain recoverable if `PAID_CHECKOUT_PUBLIC_ENABLED` is turned back off during an incident; the switch blocks creation of new intents, not reconciliation of money already submitted to Moyasar.

## Network and secrets

Allow outbound HTTPS to `api.moyasar.com`. PostgreSQL should be reachable only over its trusted private/TLS path and must not expose a public unauthenticated database port. Store live API keys and the token-encryption key outside Git. Restrict `/etc/hee/production.env` to root and the `hee` service group. Keep NTP/time synchronization enabled because subscription periods, retry leases and heartbeat freshness are time-sensitive.

## Migration and launch sequence

1. Keep production traffic and workers paused for schema migration.
2. Run the guarded `Production Database Migrations` workflow from the exact green `hee-v6-rc` SHA. It requires explicit migration and write-pause confirmations, creates an encrypted recovery artifact, restores it into `hee_restore*`, proves critical data, applies migrations once, then verifies pre-existing critical data did not change.
3. Deploy/promote that same release SHA to the production web runtime with `PAID_CHECKOUT_PUBLIC_ENABLED=false`.
4. Verify `https://hee.sa`, registration, login, policies and a public demo/business page over HTTPS, and confirm `/api/release` reports the exact deployed SHA.
5. Configure the Moyasar live webhook at `https://hee.sa/api/billing/moyasar/webhook` using the same production shared secret.
6. Install the versioned systemd worker with `BILLING_RENEWAL_ENABLED=true`, run a full successful cycle, and confirm the heartbeat.
7. Set `BILLING_OPERATIONS_READY=true` while public checkout remains false.
8. Configure one temporary `BILLING_REHEARSAL_USER_EMAIL`, perform the controlled live subscription rehearsal described above, and reconcile its financial state.
9. Remove `BILLING_REHEARSAL_USER_EMAIL`, set `PAID_CHECKOUT_PUBLIC_ENABLED=true`, and restart/redeploy the exact production SHA.
10. Run `npm run launch:config-audit`, standalone `npm run billing:state-audit`, and then GitHub `Production Launch Readiness`. The workflow must prove exact SHA provenance, live runtime readiness, migration state, billing heartbeat/state, canonical HTTPS surfaces and security/indexing headers.
11. Only after all gates pass should acquisition traffic be treated as generally open for paid subscriptions.

Never use `prisma db push` for production deployment. Never make schema changes from two application hosts at the same time.

## Incident controls

To stop new paid checkouts without touching customer data, set `PAID_CHECKOUT_PUBLIC_ENABLED=false` first and redeploy/restart the application. If billing recovery itself is unsafe, also set `BILLING_OPERATIONS_READY=false` and stop the worker. To stop automatic renewals while keeping existing paid periods intact, set `BILLING_RENEWAL_ENABLED=false` and stop the timer. Preserve payment ledger, subscriptions, checkout-consent evidence and webhook inbox rows during an incident; reconcile them instead of deleting financial history.
