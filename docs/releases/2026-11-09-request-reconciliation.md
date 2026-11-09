# INFRO request reconciliation — 9 November 2026

Scope: the user's earlier INFRO platform requests, reconciled against production
source `b8aa408c0b917f1958c10914398f6aa79eaab9fc`, current tests and release evidence.
Historical assistant statements and open draft PRs are not proof of missing or
completed functionality. This document does not certify third-party portal state,
physical hardware or live message delivery.

## Implemented baseline; retain and regression-check

| Requests | Current evidence | Acceptance boundary |
| --- | --- | --- |
| Tenant isolation, staff permissions and adaptation by business activity | `apps/web/tests/cashier-tenant-workflow.spec.ts`; Cashier Tenant Isolation production run 42631595693 passed | No cross-business customers, invoices, catalog or balances. |
| Editable services, regular/urgent prices and urgent delivery presets | Same browser workflow covers service edits, urgent price edits and missing-price entry | Existing invoices preserve their original lines and prices. |
| Fixed/percentage discounts, measured items and fractional quantities | Same workflow covers invoice/line discounts, square metres and partial fractional returns | Stored integer-halalas totals remain authoritative. |
| One operational WhatsApp consent control | Same workflow covers one control, separate recorded purposes and no consent when unchecked | Do not silently manufacture customer consent. |
| Employee commissions, complete/partial returns, refund records and subscriptions | Same workflow covers linked returns, commission reversal, prepaid restoration and financial documents | Return approval and actual cash refund remain distinct. |
| Compact cashier, keyboard shortcuts and save-and-print | Same workflow covers 1366/1280/1024 widths, dark mode, Ctrl+Enter and new-order reset | Do not regress the fixed checkout action or printer preference. |
| Thermal/A4 receipt layout, invoice number persistence and reprinting | Same workflow exercises print-media geometry, long Arabic/Latin names, image readiness and unchanged invoice count | Real printer output still requires hardware acceptance. |
| Direct Evelon D10 printing on Windows | Native Windows checks, browser raster/spool tests, release `infro-print-bridge-v1.0.0`, production deploy 42631927534 | One-time driver/companion/pairing setup on each actual Windows cashier is outstanding. |
| Contacts paste/import, manual selection, selected/all removal | `apps/web/app/dashboard/whatsapp/contacts/`, `apps/web/tests/whatsapp-contacts-customer-ux.test.ts` | Actual production file import is not re-run with customer data in this audit. |
| Booking duration, alerts, capacity and verification | `booking-duration-workflow.spec.ts`, `booking-bell-workflow.spec.ts`, `booking-verification-*.test.ts`, `branch-booking-capacity-source-guards.test.ts` | Real sender/template delivery needs a live authenticated rehearsal. |
| Paid-store booking eligibility and owner audience setting | `apps/web/app/lib/commerce/booking-audience.ts`, `booking-eligibility.ts`, `salla-booking-*.test.ts` | A confirmed unpaid order must not count as completed payment. |
| Reminders, retries and channel handling | `apps/web/app/lib/reminders/`, `smart-reminders-*.test.ts`, `smart-reminders-workflow.spec.ts` | A queue acceptance must not be presented as provider delivery. |
| Salla Easy installation, account claim and welcome outbox | `apps/web/app/lib/commerce/salla-easy-install.ts`, `apps/web/app/salla/activate/`, Salla installation/activation/welcome tests | Source presence does not prove Easy mode enabled or a new merchant rehearsal passed. |
| Public services, free identity plus three paid plans, standalone services and increased quotas | `apps/web/app/services/page.tsx`, `apps/web/app/lib/commercial-plans.ts`, `apps/web/app/dashboard/plans/services/page.tsx` | Salla's separately requested SAR119 plan must be verified in its partner portal. |
| Language system and responsive/theme review | `apps/web/app/lib/ui-i18n.ts`; Dashboard Visual Audit run 42629657287 passed | This is not a claim that every static/native string in every language was manually reviewed. |
| Temporary camera links, Windows pairing, diagnostics and WhatsApp link actions | `apps/web/app/dashboard/live-view/`, `apps/web/app/lib/live-view/`, `live-view-*.test.ts` | Connection/pairing success alone does not prove playable camera media. |

## Corrections in this follow-up

- Allow an operator to release an uncertain receipt request only after explicitly
  reviewing/cancelling its Windows queue entry. Clearing the local pending marker
  does not issue a print or create another invoice. A later explicit print creates
  a new job; automatic duplicate protection remains in place.
- Centre the direct-printer setup dialog.
- Add a business-specific data-use notice and privacy link immediately before
  public booking/request submission, plus an explicit WhatsApp handoff explanation.
  This addresses the form placement issue without claiming the full legal notice
  has been finalized.
- Return the existing bounded Salla subscription failure classification to the
  authorized client and show distinct fixed guidance for missing app, missing
  subscription, unavailable endpoint, denied permission and throttling.
- Distinguish an empty successful subscription response from an actual returned
  subscription record. None of these read-only checks grants paid access.

## Outstanding work and exact dependencies

| Work | Remaining requirement | Next concrete acceptance |
| --- | --- | --- |
| Salla SAR119 monthly plan and automatic entitlement lifecycle | Verify partner plan identity, real API availability, trial/tax presentation and authoritative subscription proof; current API deliberately returns `entitlementSync: not_enabled` | Implement verified plan mapping and renewal/expiry/cancellation ordering; prove on a new demo store and two isolated merchants. |
| Salla marketplace publication and technical review | Authenticated partner portal; current approval/listing/plan state is not established by this audit | Review the exact listing and app mode, complete new-install/welcome/activation/WhatsApp/booking/uninstall rehearsal, then submit the concrete reviewed version. |
| Zid, Shopify and WooCommerce real onboarding | Separate provider application configuration, credentials and authorized test stores | Verify each provider independently; a generic navigation label is not proof of a working integration. |
| Meta onboarding, sender registration and live OTP/campaign proof | Authenticated Meta/platform access and an approved sender/template; earlier account states may be stale | Check current WABA/number/template/webhook/billing responsibility, then perform an explicitly scoped test without messaging unrelated customers. |
| Neoleap/Newland N910 automatic charge/split/cancel integration | Official device/ECR protocol, sandbox or actual terminal, matching settlement/cancel semantics; no matching support response found in the connected inbox searches | Durable request idempotency, unknown-outcome reconciliation and atomic ledger posting, followed by real terminal acceptance. Manual card recording is not terminal charging. |
| Actual camera playback at Sada Al Marakib | Reachable branch Windows connector and DVR stream; cannot reach local equipment from this workspace | Prove media in INFRO, Windows reboot without login, network recovery, revocation/expiry and customer-link access termination. |
| Evelon D10 physical paper output | Run the released bridge on the cashier's Windows computer, official driver, 80mm configuration and pairing | Print a receipt, confirm Arabic/quantities/margins/cut and retry behaviour on actual hardware. |
| Full authenticated operational review | Customer and separate administrator sign-in completed through the normal secure login flow on 9 November. Commerce and WhatsApp screens reviewed; further provider and hardware acceptance remains open | Preserve tenant isolation and verify real provider results; never copy database tokens or manufacture sessions. |
| Open launch/legal issues #181 and #182 | Determine whether current live notices now satisfy the issue; actual operator, processing geography and retention facts must be confirmed | Reconcile issue text with current source and verified business facts before closing or opening paid launch. |

No remaining external dependency is marked complete merely because code exists.
No new messages, charges, marketplace submissions, device installations or
customer-data deletion were performed by this reconciliation.

## Authenticated follow-up on 9 November

- Production release `0655195ce5e18a454fb3d2ca56a4b773de19a95d` passed preflight and deployment; public booking/request notices were checked in the live browser.
- The active Salla demo integration was synchronizing orders. Layla Clean showed `SALLA_STORE_ALREADY_ASSIGNED`; this isolation guard must not be bypassed.
- The Shopify demo integration showed `SHOPIFY_ORDER_SYNC_FAILED`; provider diagnosis remains open.
- The administrator subscription check encountered a Prisma session-read connection failure (`08P01`) before establishing the provider subscription result. Add one bounded fresh read to authenticated session lookups only. Revoked/expired/unverified sessions remain denied; mutations and transactions are never retried by this helper.
- Local validation for this recovery: 23 focused tests, TypeScript and ESLint passed. Release CI and live recheck must be recorded separately.
