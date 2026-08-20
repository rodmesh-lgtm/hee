# HEE Data Retention Policy

This policy separates three concepts that must not be mixed: soft deletion, deactivation, and immutable customer history.

## Customer and commercial history

The following records are historical business records and must never be removed by an automatic cleanup job:

- `Customer`
- `Order`
- `OrderItem`
- `Booking`

Hard erasure, if ever required by an approved legal/privacy workflow, must be explicit, ordered, audited, and tenant-scoped. Parent deletions are protected with database `RESTRICT` constraints and CI retention audits.

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

Never use ad-hoc `DELETE ... CASCADE` cleanup against production customer/business tables. Any future erasure workflow must be reviewed together with backup/restore, tenant-integrity, and retention audits before release.
