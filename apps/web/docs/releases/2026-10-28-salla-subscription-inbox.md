# Salla subscription inbox — 2026-10-28

Scope: capture and inspect authenticated plan/trial lifecycle receipts. This
does not activate a paid INFRO subscription or create a payment. Real provider
plan mapping, authoritative subscription reconciliation and delivery acceptance
remain separate release gates before Salla marketplace submission.

## Changes

- Verify the raw HMAC, configured public app ID and linked merchant before
  accepting subscription/trial metadata. Keep addon events distinct from plans.
- Store only bounded identifiers, dates and numeric feature quantities. Exclude
  access/refresh tokens, customer information, settings and coupon metadata.
- Quarantine receipts using the production-supported `ignored` status with
  `SALLA_SUBSCRIPTION_VERIFICATION_REQUIRED`. The original proposed
  `pending_verification` status violates the deployed inbox CHECK constraint;
  no database constraint relaxation or schema migration is needed.
- Lock the scoped integration row before storage, using the same lock as
  uninstall/disconnect. A replaced connection generation is retried; a revoked
  one cannot store a receipt. Duplicate events do not overwrite another store.
- Uninstall invalidates quarantined receipts as well as queued order events.
  Reinstall does not reactivate an old invalidated receipt.
- Display safe receipt metadata and verification status only in the authenticated
  administrative commerce workspace. Billing/application events do not reset
  order synchronization health and do not dispatch order automation.

## Validation

The ingress regression executes the actual POST handler, raw HMAC verification,
transaction helper and uninstall handler against PGlite using the real
`SallaWebhookEvent` production migration, including its status and tenant-FK
constraints. Cases cover invalid signatures/app IDs, duplicate delivery,
credential exclusion, tenant conflict, revocation/replacement and reinstall.
Parser tests cover bounded fields, invalid dates, addon separation and unsafe
numeric identifiers. No production token or external delivery is used.

## Live acceptance still required

After deployment, use the already authorized isolated Salla review store to
produce a fresh lifecycle event and verify its actual feature keys in admin.
Compare those keys with the actual Partners plan configuration and resolve the
authoritative subscription-read response before enabling automatic rights.
Keep the existing administrative review grant separate from Salla billing.
No actual WhatsApp delivery, Salla charge, legal acceptance or app submission is
claimed by these tests.

Official contracts reviewed:
- https://docs.salla.dev/partner-apis/app-events
- https://docs.salla.dev/partner-apis/subscription-details
