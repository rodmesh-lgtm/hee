# HEE Platform Architecture v1

## Style
Modular monolith.

## Apps
- Customer Web
- Merchant Panel
- Admin Panel
- API

## Core modules
Identity, Merchants, Branches, Catalog, Menu Import, Orders, Payments, Commissions, Settlements, Notifications, Reporting, Audit.

## Multi-tenant rules
- Every business record belongs to a merchant.
- Orders belong to exactly one branch.
- Products can be shared by the merchant.
- Availability and price may differ by branch.
- Tenant isolation is enforced in the API.

## Stack
- Next.js + TypeScript
- Laravel API
- PostgreSQL
- Redis
- Docker
- Hetzner VPS
- GitHub Actions

## Reliability rules
- Payment status changes only from verified webhooks.
- Order creation is idempotent.
- Money is stored as integer halalas.
- Every order status change is recorded.
- Financial actions are audited.
