# INFRO × Salla: readiness review — 2026-10-26

Status: **not submitted; native Communication delivery not implemented or demo-tested**.
The partner message is an onboarding checklist, not technical approval or a rejection.
The partner portal currently presents a sign-in form. The existing app ID, OAuth mode,
configured scopes, pricing, and demo store have not been verified there.

## Existing implementation verified in source

| Component | Current behavior |
| --- | --- |
| Custom OAuth | Short-lived hashed state bound to initiating owner and business; server-side exchange; store identity checked; tenant-encrypted credentials |
| OAuth redirect | `https://ir.sa/api/commerce/salla/callback` |
| Signed webhook | `https://ir.sa/api/commerce/salla/webhook`; HMAC checked before payload use |
| Store ownership | Events resolve to an already linked active store; no account assignment from an untrusted merchant identifier |
| Order/cart journeys | Existing approved Meta templates, consent checks, active sender and integration checks; retry and deduplication |
| Booking eligibility | Orders synchronized separately from native Communication delivery |
| Partner payload privacy | `app.*` payloads now store event/merchant metadata only; authorization tokens and arbitrary merchant settings excluded |

This is a Custom OAuth integration. Receiving `app.store.authorize` does **not**
activate Easy Mode or attach a tenant. Do not change modes without inspecting the
existing application. Current app lifecycle events are ignored by the order/cart
worker: uninstall teardown and Salla plan entitlements remain work to complete.
Do not label the existing order journeys a native Communication integration.

## Native Communication work required before review

1. Inspect the existing public app in Partners. Confirm its identity, Communication
   type, WhatsApp feature, OAuth mode, minimum required scopes and demo store.
2. Add an App Function bound to `communication.whatsapp.send`. Obtain its actual
   generated runtime/response contract from the portal editor before publishing.
   The function receives `context.payload.data`: `notifiable`, `type`, `content`,
   nullable `entity` and nullable `meta`. Never require an order entity for OTP.
3. Connect the function to a tenant-scoped INFRO delivery endpoint with per-store
   credentials, replay protection and stable event identity. This endpoint does
   not exist yet. Do not reuse the order webhook as if it were that endpoint.
4. Define delivery coverage for **all** message types selected by the WhatsApp
   feature, including authentication. Use the merchant's official Meta sender.
   Map approved Utility/Marketing/Authentication templates by message purpose;
   never send arbitrary content through a generic template or use an order
   template for OTP. Preserve consent and opt-out rules where applicable.
5. Prevent double delivery between Salla-native messages and existing INFRO order
   journeys. Repeated invocation must resolve to the original delivery result.
   Return truthful structured failures; an internal queue acknowledgement is not
   proof that Meta accepted a message or that a phone received it.
6. Implement verified uninstall teardown, revoke tenant credentials and pending
   OAuth sessions, stop delivery, and guard delayed uninstall events after a fresh
   reinstall. Complete plan/trial lifecycle entitlement mapping using verified
   Salla plan identifiers; distinguish plan and addon events.

## Partner listing and billing

- Supply actual icon (square, at least 250×250), Arabic/English names, concise
  description, real screenshots, support contacts and a merchant setup guide.
- Disclose Meta and other actual subprocessors in privacy/support material.
  Existing public policy routes: `https://ir.sa/privacy`, `https://ir.sa/terms`.
  Recheck their text against the completed Communication architecture.
- Configure actual Salla plans and service trial only after verifying partner
  commission, payouts, Meta usage cost, support cost and the user's target
  **35% profit margin**. Margin means `(price - full cost) / price = 0.35`;
  compute a price floor as `full cost / 0.65`, accounting separately for any
  percentage commission and applicable tax. Do not advertise unlimited paid
  Meta messages or assume a free App Functions beta will stay free.
- Complete Basic Information, App Configurations, Features, Pricing, Contacts,
  and Service Trial. Do not submit a listing that promises unfinished coverage.

## Demo acceptance record — every item still pending

| Scenario | Required evidence |
| --- | --- |
| Install and link | Real demo merchant ID matches the INFRO business; store identity verified |
| Select provider | Merchant Apps → Settings → Customize selects INFRO as WhatsApp handler |
| Order notification | Real order/status action → Function → correct merchant sender → test phone |
| OTP and entity-less events | Authentication template, valid expiry, no code logged, no order requirement |
| Duplicate and transient error | One message after replay; timeout/rate limit returns truthful retryable outcome |
| Isolation | Another merchant cannot change recipients, use credentials, or access message records |
| Uninstall/reinstall | Old credentials unusable; old queued work stopped; stale uninstall cannot sever new install |
| Subscription/trial lifecycle | Actual plan IDs map to intended rights and cancellation/expiry behavior |

Local unit/type checks do not satisfy these demo tests. Do not notify Salla that
integration is complete until the acceptance evidence exists. No message to Salla
was sent as part of this review.

## Official references consulted

- https://docs.salla.dev/create-app
- https://docs.salla.dev/authorization
- https://docs.salla.dev/comm-apps/get-started
- https://docs.salla.dev/comm-apps/app-function
- https://docs.salla.dev/comm-apps/examples
- https://docs.salla.dev/partner-apis/app-events
- https://docs.salla.dev/playbook/launch-grow/publish-app
