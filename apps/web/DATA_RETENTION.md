# HEE Data Retention Policy

This policy separates three concepts that must not be mixed: soft deletion, deactivation, immutable customer history, and financial audit history.

## Customer and commercial history

The following records are historical business records and must never be removed by an automatic cleanup job:

- `Customer`
- `Order`
- `OrderItem`
- `Booking`

Hard erasure, if ever required by an approved legal/privacy workflow, must be explicit, ordered, audited, and tenant-scoped. Parent deletions are protected with database `RESTRICT` constraints and CI retention audits.

## Billing and subscription history

Paid-plan records are financial and entitlement evidence. They are **not** ephemeral operational data and must never be removed by the routine retention pruner:

- `Subscription`
- `BillingPayment`
- `BillingPaymentMethod`
- `BillingWebhookEvent`

Reusable provider tokens inside `BillingPaymentMethod.encryptedToken` remain encrypted at rest and must never be included in customer exports, logs, support tickets, or analytics. Revoking a payment method changes its status; it does not erase the historical payment ledger. Any future financial-retention or statutory-erasure policy must be explicitly approved and implemented as a separate audited workflow.

## Soft-deleted entities

`User`, `Business`, `Category`, `Product`, `Offer`, and `Service` use `deletedAt` where deletion semantics are required. Public reads and writes must exclude soft-deleted records.

## Deactivated directory/display entities

`Branch`, `Department`, `ContactPerson`, `GalleryItem`, and `SocialLink` use `isActive` as retirement/deactivation state. Deactivation preserves identifiers and historical references.

## Ephemeral operational data

Only short-lived operational records are eligible for routine pruning:

- expired `Session` rows
- expired `OAuthState` rows
- `RequestRateLimit` rows older than 7 days
- `PublicSubmission` idempotency rows older than 7 days

The pruning script is dry-run by default and requires both `ALLOW_RETENTION_PURGE=true` and `--apply` before deleting anything.

## Analytics

`AnalyticsEvent` is intentionally excluded from automatic pruning until a separate product/legal retention period is approved. Do not silently introduce an analytics TTL.

## Production rule

Never use ad-hoc `DELETE ... CASCADE` cleanup against production customer, business, subscription, or billing tables. Any future erasure workflow must be reviewed together with backup/restore, tenant-integrity, payment reconciliation, and retention audits before release.
