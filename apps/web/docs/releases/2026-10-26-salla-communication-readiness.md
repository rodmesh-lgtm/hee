# INFRO × Salla: readiness review — 2026-10-26

Status: **not submitted; store OAuth connected; WhatsApp delivery tests pending**.
Current requested scope is WhatsApp campaigns, order notifications, abandoned-cart
follow-up and INFRO appointments. The existing webhook-based journeys are distinct
from taking over Salla's native communication channel (including store OTP).
The native App Function checklist below is a separate future channel integration,
not proof of a requirement to take over OTP for the current marketing app.
The partner message is an onboarding checklist, not technical approval or a rejection.
Secure sign-in to the partner portal completed. Existing public app:
`1849074620`, https://portal.salla.partners/apps/1849074620, status in development,
Custom OAuth mode. The existing demo store is `iNFRO_platform`.

## Portal work verified after this review

- Found the OAuth Callback URLs field incorrectly pointing to the webhook.
  Changed it to `https://ir.sa/api/commerce/salla/callback`, received the portal's
  successful update notice and verified persistence after a reload.
- Webhook URL remains `https://ir.sa/api/commerce/salla/webhook`.
- Installed the existing app on the existing demo store. After reload the portal
  displays `iNFRO_platform (متصل)` and no longer offers Install App for it.
- The initial portal-first installation returned `session-expired` in INFRO.
  After explicit authorization and secure login to the existing review tenant,
  starting OAuth from INFRO completed successfully. The review business is
  `infrosallareview` (owner `0a3c28e7-52c2-4919-9940-c75d1424921e`).
- An explicitly approved, one-redemption GROWTH_35 + WhatsApp administrative grant
  was created and redeemed only by the review tenant. It is unpaid and revocable;
  code entry expiry does not end an already redeemed grant. No customer payment
  or production customer subscription was changed.
- INFRO displays the store as connected. Admin commerce health reports active
  integration and successful recent synchronization. An app lifecycle event was
  received and correctly ignored by the existing order processor. Actual order,
  cart and outbound message acceptance tests still need to run.
- Meta onboarding opened its explicit legal terms screen. No Continue action was
  taken there; a specific action-time confirmation is required. No number or
  approved templates are connected to the review tenant yet.
- The App Function editor offers WhatsApp communication events. No Function was
  saved, no delivery was performed, and no submission was sent to Salla.

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

## Separate native Communication channel integration (not yet implemented)

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

## Demo acceptance record

| Scenario | Required evidence |
| --- | --- |
| Install and link | Salla-side installation and INFRO-side OAuth connection confirmed for the isolated review tenant |
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

## Additional work completed in source

- Added tenant-encrypted, serialized Salla access-token refresh for order sync and
  product reads, with one retry after a rejected token. Re-read credentials under
  a row lock to avoid overwriting concurrent refreshes; preserve old ciphertext
  on malformed provider responses or network failures. No migration required.
- Added public Arabic/English merchant instructions at `/integrations/salla`,
  covering setup, consent, templates, event timing, troubleshooting and data requests.
- Added explicit Salla/Meta data flows to the privacy policy and advanced its version.
- Corrected the listing's broken `/praivce` and `/ask` links in the form and filled
  support email/guide URLs. Draft persistence must still be verified after saving.
- Validation: 1,274 unit tests, three injected refresh integration tests, scoped
  ESLint and full TypeScript check passed. These are not real Meta delivery tests.

## Pricing research and release blockers

Meta charges are paid directly by the merchant; INFRO charges a monthly software
subscription. Preserve this distinction throughout listing, pricing and tutorials.
Official App Store snapshots on 2026-10-26 show WhatsApp Line at SAR55/month,
WhatsApp Hero basic at SAR99/month, SocialBot at SAR129/month promotional,
and Cartat at SAR149/month. Feature coverage and connection methods differ;
these figures alone do not establish equivalent service or identical Meta charges.

- https://apps.salla.sa/ar/app/1662840947
- https://apps.salla.sa/ar/app/529694128
- https://apps.salla.sa/ar/app/1068787254
- https://apps.salla.sa/ar/app/996829016

Existing Salla pricing draft is SAR99/month plus SAR50 setup, with an original
price of SAR149 shown. It has not yet been reconciled with final INFRO pricing.
Do not claim a proven 35% margin without measured allocated operating/support
costs and verified Salla commission. Meta pass-through charges are excluded.
Salla paid plan/trial lifecycle → INFRO entitlements remains unimplemented;
the administrative review grant does not test or replace that integration.
The existing mandatory tutorial video URL is unverified. Actual sender setup,
delivery, uninstall/reinstall and subscription billing tests remain release gates.

## Official references consulted

- https://docs.salla.dev/create-app
- https://docs.salla.dev/authorization
- https://docs.salla.dev/comm-apps/get-started
- https://docs.salla.dev/comm-apps/app-function
- https://docs.salla.dev/comm-apps/examples
- https://docs.salla.dev/partner-apis/app-events
- https://docs.salla.dev/playbook/launch-grow/publish-app
