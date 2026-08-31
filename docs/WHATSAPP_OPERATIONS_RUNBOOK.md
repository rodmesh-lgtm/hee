# WhatsApp Operations Runbook

The WhatsApp worker runs the durable contact-import, Meta webhook, Shopify subscription,
Shopify webhook, abandoned-cart detection, campaign scheduling, delivery, customer-service
reply, automation scheduling, automation-event, and automation-delivery stages. It never
sends a bulk campaign inside an HTTP request.

## Safety gates

- `WHATSAPP_MARKETING_WORKER_ENABLED` must equal `true`; missing or any other value is a
  successful no-op.
- Production requires a 40-character `RELEASE_SHA` supplied by the exact-SHA worker
  deployment. The worker refuses to start without it.
- Immediate campaign launch is fail-closed unless the web runtime can prove its own exact
  release SHA and the latest successful WhatsApp heartbeat was produced by that same SHA.
- Meta credentials remain encrypted per business. They must not be placed in this file,
  systemd units, command arguments, or logs.
- Meta Business/Tech Provider approval and the existing outbound Meta gate remain
  independent requirements. Enabling this scheduler does not bypass either gate.
- `/etc/hee/maintenance.lock` prevents new billing and WhatsApp worker cycles. Production
  migration workflows also prove both services are inactive before touching the database.

## Deployment

Use the manually gated `production-worker-deploy.yml` workflow only after the exact SHA
has completed RC Quality, Production Preflight, and the Production web lifecycle required
by that workflow. The cutover installs both systemd units atomically and restores the
previous units, timers, release symlink, and maintenance state if any assertion fails.

The deployment starts `hee-whatsapp-operations.timer`, but actual queue processing remains
disabled until `WHATSAPP_MARKETING_WORKER_ENABLED=true` exists in `/etc/hee/production.env`.
Keep it disabled while Meta's external approval or production database migrations are
pending.

## Verification

After enabling, verify without exposing message bodies or credentials:

```bash
sudo systemctl status hee-whatsapp-operations.timer
sudo journalctl -u hee-whatsapp-operations.service --since '30 minutes ago'
```

The central admin WhatsApp page shows the last start, last successful cycle, release SHA,
and a bounded error code. A successful cycle updates the singleton
`WhatsAppOperationsHeartbeat` row only after all eleven durable stages complete. The
customer campaign page remains locked unless that heartbeat is recent and its release SHA
matches the currently deployed web release.

If a cycle fails, inspect the named stage and its durable queue state. Do not retry a Meta
request whose network outcome is ambiguous; the delivery and reply workers preserve that
fail-closed rule.

## Shopify commerce activation

Shopify activation is independent from the Meta connection and remains fail-closed unless
all of these runtime values are valid: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`,
`SHOPIFY_ADMIN_API_VERSION`, `WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY` (a dedicated
base64-encoded 32-byte key), and `WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION`.

Register the exact callback `/api/whatsapp/commerce/shopify/callback` for each allowed app
origin. The authorization-code callback verifies Shopify's query HMAC and freshness,
consumes a tenant/user-bound OAuth state once, verifies `shop.myshopifyDomain` through the
Admin GraphQL API, and requires `read_orders` plus `read_customers` before marking the
integration active. Tokens and refresh tokens are stored only inside a tenant- and
integration-bound AES-256-GCM envelope. Do not print callback queries, token responses, or
the envelope in logs.

An active OAuth connection does not by itself enable Shopify webhooks. Signed webhook
ingestion and GraphQL subscription reconciliation are a separate release gate.
