# Subscriber packages and cashier integration

The accounting workspace supports reusable, tenant-owned **monetary credit packages** for any business activity. The service catalogue determines package scope. Package price equals prepaid credit; no invented discount, bonus, VAT, piece count or visit allowance.

Owner defines a name, description, price, duration (1–366 calendar days in Riyadh), and optional service IDs. Empty service scope includes all services. Accounting-permission staff enrol registered customers and choose a start date. Each enrolment snapshots the purchased name, description and services. Archiving a package prevents new sales but does not revoke existing benefits. Create a new package version to change terms. Renewals are new purchases; prior balances remain intact.

On cashier phone entry the authenticated, no-store lookup returns this tenant's customer balances. The cashier previews coverage and remaining balance. Saving the order atomically allocates valid balances by earliest expiry, limited to eligible line values and the amount outstanding after new cash/card collections. The submitted preview amount must match the authoritative allocation; stale previews roll back the entire order. A tenant transaction lock, order request replay, unique movement/payment request keys and ledger source keys prevent duplicate deductions. Each deduction posts a prepaid payment and liability settlement, not a second cash receipt. Opt-out is explicit in the order form.

Manual redemption remains available to accounting staff. Restricted packages can manually settle only orders wholly within their service scope; mixed-scope orders must use the automatic allocation at creation. Expired balances cannot fund an order but remain refundable under the existing refund flow. Refunds record money actually returned; no bank transfer or neoleap request is sent.

Apply migration `20261022200000_accounting_packages` using the existing reviewed migration workflow **before deploying** this version. It adds AccountingPackage and additive fields on LaundryPrepaid; it preserves original balances and backfills startsAt from createdAt. It does not modify platform billing subscriptions or the separate Salla automation draft.

Limits: the current catalogue lists the latest 200 package definitions; the subscriber list and cashier lookup show up to 100 records. No automatic renewal charge, quantity/visit entitlements, automatic subscription WhatsApp messaging or live neoleap integration is included. The existing ready-order notification integration is separate.

Verification includes domain tests for service restrictions, split coverage, expiry and Riyadh dates, plus the existing browser transaction scenario extended with package creation, enrolment, archival, automatic partial-cash redemption, replay and tenant-isolated lookups.
