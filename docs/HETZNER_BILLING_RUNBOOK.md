# HEE billing on Hetzner VPS

The Moyasar integration is intentionally infrastructure-neutral. Billing uses HTTPS REST calls, PostgreSQL, environment variables and a standalone operations command. No billing code depends on Vercel APIs, Vercel Cron or Vercel storage.

## Production prerequisites

- `APP_ENV=production`
- `APP_URL=https://ir.sa`
- `AUTH_ORIGIN=https://ir.sa`
- `NEXT_PUBLIC_APP_URL=https://ir.sa`
- `PAYMENT_PROVIDER=moyasar`
- Moyasar live publishable and secret API keys
- a strong Moyasar webhook shared secret
- a 32-byte base64 `BILLING_TOKEN_ENCRYPTION_KEY`
- `BILLING_RENEWAL_ENABLED=true` only after the production worker is intentionally installed
- `BILLING_OPERATIONS_READY=true` only after the scheduled billing command has been installed and a complete cycle has succeeded
- `PAID_CHECKOUT_PUBLIC_ENABLED=false` throughout the controlled live rehearsal
- `BILLING_REHEARSAL_USER_EMAIL=<verified operator-controlled account>` only for the short rehearsal window
- PostgreSQL backups and tested restore procedure
- HTTPS/TLS for `ir.sa`

The flags deliberately represent different facts. `BILLING_OPERATIONS_READY` means recovery/renewal operations are healthy. `PAID_CHECKOUT_PUBLIC_ENABLED` means new paid checkout intents are open to every eligible customer. Do not use one as a substitute for the other.

## Moyasar webhook

Configure exactly this HTTPS endpoint in the Moyasar dashboard:

`https://ir.sa/api/billing/moyasar/webhook`

Use a strong `shared_secret` and configure the same value as `MOYASAR_WEBHOOK_SECRET`. Subscribe to payment lifecycle events used by HEE. HEE validates the shared secret and live/test environment before acknowledging payment events. Accepted events are first written to a durable PostgreSQL inbox, then processed asynchronously. Processing re-fetches each payment from Moyasar with the secret API key and checks amount, currency and HEE metadata before changing an entitlement. The recovery worker retries unprocessed inbox rows after transient runtime/provider failures.

## Billing operations worker on Hetzner

The operations command is a normal Node process and deliberately performs three phases in order:

1. recover durable Moyasar webhook inbox events;
2. reconcile/renew eligible subscriptions;
3. run the billing state drift audit after reconciliation and record a durable successful-run heartbeat.

The heartbeat stores both `lastSucceededAt` and the exact `releaseSha` that executed the cycle. Production readiness rejects a fresh heartbeat from an older worker release; the worker SHA must match the exact web release SHA being audited.

The production scheduler is versioned in the repository:

- `ops/systemd/hee-billing-renew.service`
- `ops/systemd/hee-billing-renew.timer`

The timer runs every 30 minutes and the service is `Type=oneshot`, which prevents a second systemd activation from starting while the current invocation is still active. The service reads secrets from `/etc/hee/production.env`, reads only the non-secret `RELEASE_SHA` from `/srv/hee/current/release.env`, and sends logs to journald.

### One-time host preparation

The host must run Node.js 24 and have an unprivileged deployment account configured for SSH key authentication. Pin the host key in the GitHub Production secret `PRODUCTION_HETZNER_KNOWN_HOSTS`; never use `StrictHostKeyChecking=no`.

Create the service group, secret file and release root once as an administrator. The deploy account needs only restricted non-interactive sudo sufficient for the versioned workflow operations (`install`, `mv`, `ln`, `chown`, `chmod`, and `systemctl` for the two HEE billing units). Do not grant unrestricted root shell access merely for deployment.

```bash
install -d -o root -g hee -m 0755 /srv/hee /srv/hee/releases
install -d -o root -g hee -m 0750 /etc/hee
# Create /etc/hee/production.env through the production secret-management path.
chown root:hee /etc/hee/production.env
chmod 0640 /etc/hee/production.env
```

Production GitHub configuration required by `Production Billing Worker Deploy`:

- variable `PRODUCTION_HETZNER_HOST`
- variable `PRODUCTION_HETZNER_USER`
- secret `PRODUCTION_HETZNER_SSH_PRIVATE_KEY`
- secret `PRODUCTION_HETZNER_KNOWN_HOSTS`

### Exact-SHA worker deployment

Do not `git pull` directly into the active worker directory. Run the manually gated GitHub workflow `Production Billing Worker Deploy` from the exact `hee-v6-rc` SHA, entering `DEPLOY_EXACT_BILLING_WORKER` only after that same SHA has all of these successful gates:

1. RC Quality;
2. Production Preflight;
3. Production Web Deploy.

The workflow packages the exact Git tree, uploads it over pinned-host-key SSH, prepares dependencies and Prisma client in a staging directory, runs TypeScript validation, and only then begins cutover. It stops future timer activations but never kills an in-flight billing service. If an existing cycle remains active for 20 minutes, deployment refuses cutover.

Activation is atomic through `/srv/hee/current`: the immutable release lives under `/srv/hee/releases/<SHA>`, `release.env` records that SHA, and the symlink is swapped only after preparation succeeds. The versioned systemd units are then installed and the timer re-enabled. A failure before cutover leaves the current release untouched; a failure during cutover attempts to restart the timer through the workflow cleanup trap.

After deployment, verify:

```bash
readlink -f /srv/hee/current
cat /srv/hee/current/release.env
systemctl cat hee-billing-renew.service
systemctl status hee-billing-renew.timer --no-pager
systemctl list-timers hee-billing-renew.timer --no-pager
```

Before marking billing operations ready, execute one controlled cycle and inspect it:

```bash
systemctl start hee-billing-renew.service
systemctl status hee-billing-renew.service --no-pager
journalctl -u hee-billing-renew.service -n 200 --no-pager
systemctl list-timers hee-billing-renew.timer --no-pager
```

The completed cycle must write a heartbeat whose `releaseSha` equals the web `/api/release` SHA. A stale heartbeat or a heartbeat from a different release is not launch-ready.

Do not use both cron and the systemd timer. Exactly one scheduler should own the production database. Database/advisory locking and uniqueness constraints protect critical renewal transitions, but operations should still avoid intentionally launching concurrent schedulers.

Treat a non-zero exit from `npm run billing:renew` as an operational alert. In particular, webhook recovery exits non-zero when an event must be retried, and `billing:state-audit` fails when it detects plan-price drift, expired paid entitlements still marked live, inconsistent plan/subscription lineage, missing payment methods for auto-renew, invalid receipt snapshots, exhausted webhook retries, stuck webhook processing leases, a stale heartbeat, or worker/web release drift. The heartbeat is written only after all three phases complete successfully.

With `BILLING_OPERATIONS_READY=true`, a standalone `npm run billing:state-audit` verifies that the last successful heartbeat is no older than 90 minutes and that its release SHA matches `RELEASE_SHA`. Because the scheduler runs every 30 minutes, this permits one delayed/missed run while still detecting a stopped scheduler. A stale, missing, or wrong-release heartbeat is a paid-checkout incident: set `BILLING_OPERATIONS_READY=false` and `PAID_CHECKOUT_PUBLIC_ENABLED=false`, restart the web application, investigate the worker release/scheduler, and do not re-enable readiness until a complete `npm run billing:renew` succeeds on the exact release and a following standalone state audit passes.

## Controlled live subscription rehearsal

The live rehearsal must not require opening payment to all customers.

1. Set `PAID_CHECKOUT_PUBLIC_ENABLED=false`.
2. Set `BILLING_REHEARSAL_USER_EMAIL` to one operator-controlled, verified HEE account only.
3. Ensure `BILLING_RENEWAL_ENABLED=true`, deploy the exact-SHA worker, and run one successful `hee-billing-renew.service` cycle.
4. Verify the heartbeat SHA exactly matches `https://ir.sa/api/release`.
5. After the heartbeat is fresh and matching, set `BILLING_OPERATIONS_READY=true` and restart/redeploy the production runtime. Only the configured rehearsal account can now create a new paid checkout intent.
6. From that account, execute exactly one authorized live subscription rehearsal and verify callback, durable webhook inbox, provider re-fetch, entitlement activation, receipt snapshot, cancellation, and the intended renewal/reconciliation behavior.
7. Confirm the payment ledger and subscription state with `npm run billing:state-audit` and inspect the worker logs.
8. Remove `BILLING_REHEARSAL_USER_EMAIL` completely.
9. Only after the rehearsal is accepted, set `PAID_CHECKOUT_PUBLIC_ENABLED=true` and restart/redeploy the runtime.
10. The final `npm run launch:config-audit` and `Production Launch Readiness` workflow intentionally fail if the public switch is not true, if the rehearsal email remains configured, or if the worker SHA does not match the web release.

Existing provider-started payment intents remain recoverable if `PAID_CHECKOUT_PUBLIC_ENABLED` is turned back off during an incident; the switch blocks creation of new intents, not reconciliation of money already submitted to Moyasar.

## Network and secrets

Allow outbound HTTPS to `api.moyasar.com`. PostgreSQL should be reachable only over its trusted private/TLS path and must not expose a public unauthenticated database port. Store live API keys and the token-encryption key outside Git. Restrict `/etc/hee/production.env` to root and the `hee` service group. Keep NTP/time synchronization enabled because subscription periods, retry leases and heartbeat freshness are time-sensitive.

## Migration and launch sequence

1. Run `Production Preflight` on the exact green `hee-v6-rc` SHA while paid checkout is closed. It is read-only and must prove Production/restore DB reachability, TLS, Resend, Moyasar, Vercel and required configuration before maintenance.
2. Pause production writes/workers for schema migration and run the guarded `Production Database Migrations` workflow on that same SHA. It requires explicit migration and write-pause confirmations, creates an encrypted recovery artifact, restores it into a clean `hee_restore*`, proves critical data, applies migrations once, then verifies pre-existing critical data did not change.
3. Run `Production Web Deploy` for that same SHA with `PAID_CHECKOUT_PUBLIC_ENABLED=false`; confirm `https://ir.sa/api/release` reports the exact SHA.
4. Verify `https://ir.sa`, registration, login, policies and a public demo/business page over HTTPS.
5. Configure the Moyasar live webhook at `https://ir.sa/api/billing/moyasar/webhook` using the same production shared secret.
6. Run `Production Billing Worker Deploy` for the same SHA, then execute a controlled worker cycle and verify its heartbeat SHA equals the canonical web SHA.
7. Set `BILLING_OPERATIONS_READY=true` while public checkout remains false and redeploy the same exact web SHA so Runtime sees the reviewed flag.
8. Configure one temporary `BILLING_REHEARSAL_USER_EMAIL`, redeploy the same SHA, perform the controlled live subscription rehearsal described above, and reconcile its financial state.
9. Remove `BILLING_REHEARSAL_USER_EMAIL`, set `PAID_CHECKOUT_PUBLIC_ENABLED=true`, and redeploy the exact production SHA again.
10. Run `npm run launch:config-audit`, standalone `npm run billing:state-audit`, and then GitHub `Production Launch Readiness`. The workflow must prove exact SHA provenance for both web and worker, live runtime readiness, migration state, billing state, canonical HTTPS surfaces and security/indexing headers.
11. Only after all gates pass should acquisition traffic be treated as generally open for paid subscriptions.

Never use `prisma db push` for production deployment. Never make schema changes from two application hosts at the same time.

## Incident controls

To stop new paid checkouts without touching customer data, set `PAID_CHECKOUT_PUBLIC_ENABLED=false` first and redeploy/restart the application. If billing recovery itself is unsafe, also set `BILLING_OPERATIONS_READY=false` and stop the worker timer. To stop automatic renewals while keeping existing paid periods intact, set `BILLING_RENEWAL_ENABLED=false` and stop the timer. Preserve payment ledger, subscriptions, checkout-consent evidence and webhook inbox rows during an incident; reconcile them instead of deleting financial history.
