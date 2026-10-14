# INFRO launch review — 2026-10-14

Scope: canonical ir.sa. This report does not authorize admin.ir.sa publication or a real customer charge.

## Observed production state

- Release reviewed: f155c7f53a0b1c4c55f487b378e17375c2fbbdf9.
- Web runtime is ready; the separate full paid-launch readiness endpoint returns false.
- Homepage, registration, login, terms, privacy, contact, demo and sitemap returned HTTP 200.
- Homepage includes CSP and HSTS and did not return an X-Robots-Tag noindex header.
- Moyasar credential entries exist in production configuration; their values were not decrypted or validated by this inspection.
- Seller legal name, seller address and tax status are empty.
- Public paid checkout, renewal and billing-operations readiness flags are false; no rehearsal account is selected.
- WhatsApp delivery remains a separate launch dependency. Earlier Meta registration/delivery failures require a fresh successful registration and approved-template delivery proof. Existing Meta case: 39182972431346997.

## Changes in this batch

- Distinct homepage presentation with restrained hero treatment and an editorial activity list linked to a working demo.
- Checkout appearance aligned with INFRO colors.
- Moyasar script uses onReady so client-side route remounts can initialize an already-loaded script.
- Branding displays all billing entry/checkout redirect outcomes, including pending-payment instructions that discourage duplicate payment.

## Remaining paid-launch gate

1. Owner supplies/validates exact seller legal name, billing address and actual tax status. Do not infer tax status from an absent VAT number.
2. If VAT registered, the current code intentionally blocks paid launch until the compliant e-invoicing path is implemented and verified; do not set not_registered to bypass this.
3. Configure verified live Moyasar credentials/webhook and operational schedule through the existing protected deployment workflow. Presence of an environment key is not evidence of a valid credential.
4. Observe successful billing worker execution and matching-release heartbeat. Only then set operations/renewal readiness.
5. Select a verified eligible rehearsal owner account. A real payment requires explicit transaction authorization and user completion of bank/3DS steps. Do not charge a customer to obtain launch evidence.
6. Prove provider settlement, subscription activation, consent, receipt, processed webhook and future renewal method using the existing production billing launch proof.
7. Publish public paid mode only after that proof; run Production Launch Readiness against the exact canonical release.
8. Before advertising appointment confirmations or WhatsApp campaigns, verify the relevant tenant sender registration, approved template and consented delivery. Do not generalize one sender's failure to all tenants.

A successful web deployment alone does not satisfy these paid-launch or messaging gates.
