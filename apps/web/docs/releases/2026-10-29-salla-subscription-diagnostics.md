# Salla subscription verification — 2026-10-29

## Live evidence

The isolated `infrosallareview` tenant received five signed official demo
simulator events: trial start, INFRO WhatsApp plan start/renewal/expiry, and
INFRO Plus plan start. Each is attached only to the existing review integration.
No payment, customer entitlement or customer store was changed. The received
subscription events omit subscription ID, item type, environment and numeric
features. Names alone cannot establish base-plan versus addon rights.

The authoritative subscription GET still returns HTTP404 after the simulated
start. Its app ID and public OAuth client match the Partners configuration.
The review tenant has no connected Meta sender; production customer senders must
not be borrowed to claim delivery acceptance. Real sender/template delivery,
verified plan mapping and marketplace submission remain incomplete.

## Changes

- Read provider JSON with a 64KiB bound. Reject malformed or oversized success
  bodies rather than treating them as subscription evidence.
- Recheck the active business/store/connection generation after the request.
  Disconnection or replacement invalidates the old result before returning it.
- Classify a provider error into fixed app-not-found, subscription-not-found,
  endpoint-not-found, permission, rate-limit or unclassified reasons. Do not
  expose raw provider text, tokens or customer metadata to the admin browser.
- Give administrators concrete, reason-specific next steps without interpreting
  HTTP404 as nonpayment or granting paid access.

## Validation

Regression tests execute the actual read module with injected provider and
database dependencies: foreign binding before credential transmission,
disconnect/replacement during an in-flight request, one 401 refresh, fixed safe
404 classification and malformed/oversized responses. No external messages or
production credentials are used by tests. No schema migration is required.
