# INFRO laundry implementation status

Updated 2026-10-16. User requested a multi-tenant product comparable in scope to the supplied MCSE feature list. INFRO remains the product name. A listed requirement is not a claim that it ships.

## Release in this branch

- Touch targets, mobile catalog/cart switching, tablet split layout, product search, mobile order cards.
- Approved INFRO brand component, tenant logo upload, receipt logo, A4 / 80 mm browser printing.
- Automatically show the persisted invoice after order creation; preserve server-authoritative totals and idempotency.
- Owner-only period reports: payment methods, expenses, opening/closing receivables, capped movement listing, CSV export with formula neutralization.
- Existing tenant-scoped services, orders, collections, expenses, sequential fulfillment, audit and staff section permission remain in force.
- No VAT or tax number for the current non-registered business. Card/transfer recording does not execute payment.

## Required product modules — acceptance criteria and gaps

| Requirement | Current evidence | Remaining acceptance criteria |
| --- | --- | --- |
| Cloud POS | Persisted orders, prices, payments, receipts, tenant guards; responsive work in this branch | Cash shifts, reconciliation, refunds/voids, controlled discounts, customer lookup |
| Customers and laundry subscriptions | Customer name/phone snapshots on orders | Tenant customer profile, consent/contact preferences, statement, prepaid plans with audited purchase/redemption/expiry/refund; platform subscription is NOT a laundry subscription |
| Inventory / stocktake / electronic warehouse | Not implemented for laundry | Warehouses, SKUs/units, receipts/issues/transfers, stock counts, adjustment reason, balances, reorder alerts, negative-stock/concurrent-write guards |
| Journal and basic accounting | Operational cash/receivable report, not double-entry accounting | Chart of accounts, balanced journals, immutable posting, reversals, source links, period locking and audit |
| Full accounting | Not implemented | Opening balances, receivables/payables, purchase bills, supplier ledger, bank reconciliation, general ledger, trial balance, accrual income and balance sheet; fixtures must prove debit=credit and source-to-ledger reconciliation |
| Employees and permissions | Existing platform staff and laundry section access; owner-only configuration/expenses/reporting | Separate cashier, supervisor, accountant and driver scopes with server-enforced row/action access; no blanket driver access to customers/finance |
| Delivery app | Not implemented | Mobile driver workspace, assigned jobs only, pickup/delivery stages, proof of delivery, customer location with consent, cash handoff and failed delivery handling; no claim of native-store app |
| Contracts / vouchers / e-signature | Saved receipt / payment evidence only | Versioned contract, parties, terms, acceptance evidence, immutable signed copy, revocation/reissue; validated e-signature provider integration where required. Drawing a signature is not a certified digital signature |
| ZATCA phase 2 | Not connected and not enabled | Separate eligible tenant tax configuration, compliant XML and cryptographic chain, sandbox conformance, reporting/clearance, rejection/retry monitoring, certificates and real onboarding before production. Never fabricate VAT registration or certification |

## External dependencies

- ZATCA production enrollment, credentials and certificates belong to each eligible business. The current business is explicitly non-VAT-registered. Official references: https://zatca.gov.sa/ar/E-Invoicing/Pages/default.aspx and https://zatca.gov.sa/ar/E-Invoicing/Introduction/Pages/Roll-out-phases.aspx (reviewed 2026-10-16).
- Real Mada/acquirer hardware/payment integration remains deferred by the user's instruction.
- Certified signature provider/account and delivery external services require explicit selected integrations, credentials and their acceptance tests. No placeholder should be represented as live integration.

## Implementation sequence

1. Publish verified cashier, branding, responsive layout and operational reports.
2. Introduce shared transactional customer, inventory and double-entry schemas with migrations and tenant-isolation tests; backfill only provable historical events, never invented opening balances.
3. Add subscriptions, purchase/supplier flows, shifts, refunds and financial statements against those primitives.
4. Add least-privilege driver workflows, contracts and signature integration.
5. Complete optional ZATCA sandbox/production onboarding for eligible tenants. Track separately from non-VAT laundry readiness.

Do not market the full list as completed until each acceptance criterion has a persistent implementation and end-to-end evidence.
