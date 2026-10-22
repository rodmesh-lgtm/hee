# INFRO terminal integration — implementation checkpoint

## Confirmed customer provider (2026-10-22)

The owner confirms that Layla Clean already uses **neoleap** POS terminals.
Hardware procurement is no longer a blocker for this tenant. Do not ask again
whether the customer has bought a terminal, and do not substitute Nami or another
provider. This is a tenant-specific integration requirement, not a platform-wide
default or an activated terminal binding.

Official neoleap POS pages describe cashier/accounting solutions, but the public
pages reviewed did not expose the terminal ECR API/SDK specification. Do not use
the separate online payment gateway documentation as a terminal purchase protocol.

Required next evidence from neoleap: supported device model and payment app version,
ECR activation procedure, official terminal integration SDK/API and sample responses,
cloud versus local bridge availability for iPad/mobile/desktop web, sandbox access,
status lookup after timeout, duplicate request handling and result authentication.
No endpoint, payload, signature scheme or transport should be invented.

Official references: https://www.neoleap.com.sa/en/pos and
https://www.neoleap.com.sa/ar/pos (reviewed 2026-10-22).
Published support phone: 8001000085. No support message has been sent.

Status: foundation only. No live provider, device connection, purchase endpoint,
webhook, payment persistence, or automatic ledger posting is enabled by this change.
The existing `card` method remains manual recording of an independently completed payment.
Do not describe this checkpoint as a working mada integration.

## Mixed tender and device cancellation (confirmed requirement)

The cashier must accept multiple allocations on one order, including cash plus mada.
For a 100 SAR order with 30 SAR received in cash, dispatch only 70 SAR to the terminal.
Persist cash as a separate payment; never mark the entire order paid while the card
allocation is pending. The `split-payment.ts` domain helpers implement the amount
planning and balance projection only; they are not connected to checkout or storage yet.

An authenticated terminal cancellation/decline cancels only that card attempt,
releases its reservation and leaves the order partially paid with the cash intact.
It must update the open cashier automatically through authenticated status polling
or a verified event, with the persisted state surviving browser reloads. A timeout
keeps funds reserved until the same transaction is resolved. Closing a dialog is
not terminal cancellation. Approval followed by cancellation is a reconciliation
conflict, not permission to erase the payment; void/refund requires a separate
provider-confirmed operation and compensating ledger entry.

Each allocation needs a stable idempotency key, actor, method, amount and status.
Ledger posting must be atomic, unique and append-only; receipts show confirmed cash,
confirmed card and remaining balance separately. Simultaneous manual collection
must not consume funds reserved by an unresolved terminal attempt. Unit tests cover
mixed amounts, cancellation, repeated results, late approval, reservations and scope;
provider-backed and database concurrency tests are still required before activation.

## Completed

- Owner-only device information section in the unified accounting workspace.
- Disabled, explicitly labelled terminal option in checkout and subsequent payments.
- Provider-neutral request, adapter and result reconciliation contracts with tests.
- Integer halalas; exact tenant/device/order/request/amount/currency matching.
- A timeout is `unknown`, not declined. A second purchase on a pending/unknown
  attempt is rejected. A final conflicting result requires manual reconciliation.
- No credentials, PAN, PIN, CVV or raw provider payloads in this domain contract.

## Provider-dependent work still required

1. Obtain the chosen provider's official integration specification, sandbox access,
   terminal identifier, credential scope and webhook verification method. Do not
   assume generic mada branding defines an API. Do not select or subscribe the user
   to a provider automatically.
2. Implement the concrete adapter on the server. For iPad/mobile browsers prefer a
   provider-supported cloud API; a local SDK requires a separately installed trusted
   bridge or native app. Never ask a browser to send arbitrary TCP/USB messages.
3. Add a reviewed migration for tenant-scoped terminal bindings and durable payment
   attempts, with provider-reference uniqueness, idempotency and an exclusive active
   attempt per terminal/order. Atomically claim a request before network dispatch;
   the pure domain helper alone does not provide cross-process idempotency.
4. Authorize every command using the active business and existing cashier permission;
   only the owner configures a terminal. Retrieve outstanding amounts from the DB.
5. Save the order before issuing a purchase. Lock its payment reservation, retain the
   immutable amount, and keep manual/other collection from racing a pending attempt.
6. On confirmation send the chosen full/partial amount. Authenticate callbacks and
   query provider status, compare all fields, then atomically post exactly one
   payment and ledger entry. Never trust a browser `approved` value.
7. Handle process crashes, duplicate/out-of-order callbacks, polling, cancellation,
   provider outage, retry after unknown, and reconciliation of late approvals.
   A new attempt must not be allowed while an earlier charge is unresolved.
8. Verify with the chosen terminal and provider sandbox before allowing production.
   Tests must cover approval, decline, timeout then late approval, duplicate callback,
   tenant mismatch, amount mismatch, concurrent submissions, partial payments and
   browser reload. Actual financial transactions require the user's execution.

## Official reference consulted (2026-10-22)

https://docs.namipay.com.sa/ describes cloud middleware for server-to-server SaaS
integration and local/native alternatives. This is architectural evidence only,
not a chosen provider or claim that any Nami device is already connected.
https://docs.namipay.com.sa/docs/android-integration-guide describes provider-specific
SDK, device setup, request and response handling.
