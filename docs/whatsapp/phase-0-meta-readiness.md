# iR WhatsApp Marketing — Phase 0 Meta Readiness

Status: implementation baseline (no Production migration)
Date: 2026-08-27
Scope: Meta WhatsApp Business Platform / Cloud API only

## Non-negotiable product boundaries

- Use only Meta's official WhatsApp Business Platform / Cloud API. No WhatsApp Web, QR-session automation, unofficial clients, or browser-session libraries.
- Existing iR `Business.id` remains the tenant boundary. WhatsApp data must never introduce a parallel tenant identity.
- Phase 0 performs no Production database migration and sends no customer messages.
- Meta access tokens, app secrets, webhook secrets, and other credentials are server-only secrets. They must never be returned to browser APIs, rendered into HTML, included in analytics/data exports, or written to application logs.
- Marketing eligibility is fail-closed. A customer/order/booking record is not evidence of marketing opt-in.
- iR subscription revenue and Meta/WhatsApp usage charges are separate accounting domains.

## Official Meta integration baseline

The release path is Embedded Signup for onboarding customer WABAs to Cloud API. Meta's current official collection states that release requires App Review and Advanced Access for `business_management` and `whatsapp_business_management`; Cloud API messaging uses `whatsapp_business_management` and `whatsapp_business_messaging`, with `business_management` required for business-portfolio operations used by the Embedded Signup partner flow.

The onboarding implementation must support the official sequence:

1. Embed the Meta signup flow in the authenticated iR customer portal.
2. Resolve the customer WABA shared with iR.
3. Assign the appropriate iR system user to that WABA.
4. Register/resolve the customer's phone number and Phone Number ID.
5. Subscribe the iR Meta app to the WABA for webhooks.
6. Synchronize message templates.
7. Record billing responsibility explicitly before enabling paid traffic.

No connection is considered `ready` until all required server-side proofs succeed.

## Meta assets required before live onboarding

The iR operator must provision/approve these assets in Meta; values are supplied to iR as deployment secrets/configuration, never committed to Git:

- Meta Business Portfolio for iR.
- Meta Developer App with WhatsApp product.
- Embedded Signup configuration ID.
- App Review approval and required Advanced Access.
- iR system user and production-grade system-user credential strategy.
- Webhook product configured with HTTPS callback on the canonical iR domain.
- App Secret for webhook authenticity verification.
- WABA subscription capability tested end-to-end.
- Billing/credit-line arrangement selected and contractually understood.
- Meta-required privacy policy, terms, data-deletion/account-management surfaces verified before App Review submission.

## Server configuration contract

The future implementation must consume these through server-side environment/config validation. Names are reserved now so implementation and operations use one contract:

- `META_APP_ID` — non-secret application identifier.
- `META_APP_SECRET` — secret; used server-side, including webhook authenticity verification where applicable.
- `META_BUSINESS_ID` — iR Business Portfolio identifier.
- `META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID` — Embedded Signup configuration identifier.
- `META_WHATSAPP_SYSTEM_USER_ID` — iR system user identifier.
- `META_WHATSAPP_SYSTEM_USER_TOKEN` — secret credential; server/worker only.
- `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` — secret random verification token; server-only.
- `META_WHATSAPP_GRAPH_VERSION` — deliberately pinned Graph API version; never silently follows latest.
- `META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY` — dedicated key for encrypting tenant Meta credentials; must not reuse payment-token encryption material.
- `META_WHATSAPP_BILLING_MODE` — explicit operational mode; initially only accepted values should be `customer_meta` or `ir_pass_through` once the approved Meta onboarding model is known.

Phase 0 intentionally does not invent production values for any of these.

## Credential lifecycle

Tenant credentials must be encrypted at rest with authenticated encryption and a versioned envelope that supports key rotation. Database rows may store key version, ciphertext, nonce/IV and authentication data, but never plaintext tokens. Decryption occurs only in server/worker code immediately before a Meta request.

Required controls:

- no token getter exposed to React/client code;
- redact Authorization headers and token-like fields before logging errors;
- no credentials in audit-log metadata;
- no credentials in customer data export;
- credential rotation/revocation timestamps;
- disconnect flow revokes or makes credentials unusable and disables sending fail-closed;
- automated tests scan server responses/logging helpers for accidental secret exposure.

## Webhook security contract

The production callback will be a dedicated endpoint (planned `/api/webhooks/meta/whatsapp`). It must:

- implement Meta webhook verification for subscription setup;
- verify request authenticity with the Meta App Secret before trusting POST events;
- reject malformed/oversized payloads before durable ingestion;
- persist a dedupe key/event identity before asynchronous processing;
- acknowledge valid events quickly and process them outside the request path;
- map WABA/Phone Number ID to an internal `businessId`; never accept a tenant ID from the webhook payload or query string as authorization;
- redact message content/PII from operational logs;
- retain raw webhook data only for a defined, minimal retention period needed for reconciliation/support.

## Tenant and authorization contract

All WhatsApp domain records are scoped by `businessId`. Any child lookup that can mutate/read tenant data must prove the active business in the same query/transaction. Provider identifiers (WABA ID, Phone Number ID, Meta Message ID) are lookup keys, not authorization credentials.

Phase 1 must add isolation tests covering at least:

- Business A cannot read/update/delete Business B contacts.
- Business A cannot select Business B template/campaign/segment.
- guessed campaign/message/conversation IDs do not cross tenants.
- webhook events cannot be reassigned by caller-supplied `businessId`.
- a stale active-business cookie cannot bypass ownership checks.

## Billing decision gate

Do not hard-code WhatsApp prices. Meta's commercial model/rate card can change. Store provider usage dimensions and provider cost snapshots sufficient for reconciliation, while keeping the iR feature/add-on subscription separate.

Before live onboarding, operations must select one supported responsibility model based on the Meta-approved partner setup:

- `customer_meta`: customer is responsible for Meta billing under the approved onboarding arrangement; or
- `ir_pass_through`: Meta invoices iR/its approved credit line and iR separately passes the provider cost to the customer.

The official Embedded Signup partner documentation currently describes sharing the provider's line of credit with client WABAs, under which the client pays the solution provider and Meta/Facebook invoices the provider in aggregate. Therefore iR must not promise direct customer-to-Meta billing until Meta approves a setup that actually provides it.

## Phase 0 exit criteria

Phase 0 is complete only when:

- this integration/security contract is reviewed;
- the Meta Business/App ownership decision is recorded;
- Embedded Signup configuration exists in Meta;
- App Review/Advanced Access has been submitted or approved as applicable;
- billing responsibility is selected;
- production secret owners/rotation process are assigned;
- webhook callback domain and privacy/legal URLs are ready for Meta review;
- a Meta test WABA/number is available for Phase 1 integration testing.

Code/database work for Phase 1 may be developed against placeholders/test assets, but Production WhatsApp migrations and live customer onboarding remain gated by the release process and explicit production approval.

## References

Primary implementation reference: Meta's official WhatsApp Business Platform Postman workspace and Embedded Signup/Cloud API collections, checked 2026-08-27. The source URLs are intentionally documented here for engineering review, not consumed dynamically at runtime:

- https://www.postman.com/meta/whatsapp-business-platform/overview/
- https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup
- https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api
