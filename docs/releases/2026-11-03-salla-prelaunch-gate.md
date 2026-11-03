# Salla pre-launch readiness — 2026-11-03

Status: **NOT READY for the final live demonstration**. This audit is based on
production source d219916cfe6eab2c315cf859de7aeb415a303777 and the partner's
pre-launch meeting email. It does not certify the portal settings or live flows.

## Findings and release blockers

| Requirement | Evidence | Remaining work |
| --- | --- | --- |
| Easy OAuth installation into a new demo store | Current webhook looks up an active integration before processing app events; an unknown merchant receives 404. Custom OAuth is implemented separately. | Add authenticated Easy installation orchestration before the existing lookup, then enable Easy mode in the portal after deployment. |
| Access/refresh token storage | Existing credential encryption is bound to business/integration/provider. Existing refresh serialization is reusable. | Store Easy tokens only in the encrypted envelope; verify upstream merchant identity; protect against retries, races and old install events. |
| Automatic merchant account | Current Custom OAuth starts with an existing signed-in INFRO user. | Provision a merchant workspace without joining unrelated tenants by email; provide an email-verified account-claim flow and record actual terms acceptance. |
| Welcome email | No Easy installation welcome path found. | Durable delivery record with retry/idempotency; verify delivery in the new demo store. Do not put OAuth tokens in email. |
| Pricing | User approved SAR119/month for campaigns, reminders and appointments; Meta fees are merchant-paid. | Verify exact partner plan ID, price/tax presentation and subscription lifecycle mapping. No entitlement should be granted from an unverified plan name or receipt alone. |
| Subscription activation | Subscription events are stored for diagnostics. | Map verified Salla plans to scoped entitlements; test renewal, expiry, cancellation and duplicate/out-of-order events. |
| Portal access | Partner portal redirects to login in the current browser. | Secure sign-in required to inspect settings, plan and create a new demo store. |
| Feature demonstration | Existing implementations are present, but were not exercised on a fresh install during this audit. | Run the live acceptance script below; capture safe evidence. |

## Implemented in this branch (not enabled in production)

- Easy authorization handler runs after HMAC verification and before existing-store
  lookup when `SALLA_EASY_MODE_ENABLED=true`. Default off preserves Custom OAuth.
- Provider user-info verification compares merchant ID. Existing tenant ownership
  is preserved even if the installer is a different Salla employee.
- Transactional provisional account, unpublished business, encrypted integration
  credential and tenant-bound installation record. Conflicting historical tenant
  mappings fail closed. No paid entitlement or session is created on installation.
- Hashed, expiring, single-use activation link; initial password and real legal
  acceptance are required. Existing password/OAuth accounts require sign-in and
  cannot have their credentials overwritten by installation links.
- Durable welcome-email outbox with leases, retries and provider idempotency.
  The activation secret is encrypted while pending and cleared after accepted send.
  Welcome links use fragments to avoid HTTP query logs.
- Dedicated migration with composite tenant/integration FK and unique merchant.
- Local validation: 94 targeted Salla tests (including orchestration fixtures,
  activation guards and actual PGlite migration constraints), TypeScript and scoped
  ESLint. This does not constitute a live fresh-store acceptance test.

Portal observed on 2026-11-03: app under review; Custom OAuth selected;
webhook Signature selected; canonical webhook URL configured; existing
`iNFRO_platform` demo store connected. No new store created and no portal mode changed.

### Outstanding release gates

- CI, backed-up migration workflow, preview/live rehearsal and deployment.
- Confirm worker schedule actually runs the welcome outbox in the deployed worker.
- Prove delivery to a real test inbox and complete the activation/login journey.
- Self-service activation-link renewal is implemented with email/IP limits and a
  generic response. Verify real delivery and renewal during the live rehearsal.
- Implement and verify the SAR119 Salla subscription entitlement lifecycle.
- Exercise actual WhatsApp sender/template delivery and appointment/OTP workflow.
- Expired claim secrets are cleared by the welcome worker. Provisioned account
  record retention still needs an explicit policy.

### Follow-up verification

- Default Node test mode: 83 Salla unit tests passed, including activation-link
  renewal and welcome delivery retry/revocation/ownership checks.
- TypeScript and scoped ESLint passed.
- CI applied the additive migration successfully to PostgreSQL. Its unit phase
  exposed a missing readiness migration entry and a server-only test harness
  import; both were corrected without relaxing production isolation checks.

## Required implementation properties

1. Authenticate the webhook before parsing credentials. Use only the configured
   official auth scheme confirmed in the partner portal; do not silently accept
   unsigned payloads as an Easy Mode fallback.
2. Validate the access token against Salla and compare the returned merchant ID
   to the signed event. The user-info endpoint can describe an employee, not
   necessarily the store owner. Do not promote that person to owner of an existing
   INFRO business or merge accounts based solely on a matching email.
3. Serialize installation/reinstallation/uninstallation by merchant ID. Enforce a
   single active mapping across tenants. Keep a lifecycle timestamp and durable
   event identity; never overwrite a rotated credential on duplicate delivery.
4. Store tokens encrypted, retain only a hash of account-claim secrets, expire and
   consume them once, and never write secrets into audit logs or event diagnostics.
5. Separate claim/terms completion from payment entitlements. Do not manufacture
   consent or treat app installation as a paid subscription.
6. Make welcome-email retry independent of installation success; a transient mail
   failure must not generate duplicate users, workspaces or welcome messages.
7. Do not switch the production portal to Easy Mode until deployment and migration
   verification succeed. Existing Custom OAuth connections must remain usable.

## Live meeting rehearsal (new store, no reused integration)

1. Create a new demo store and install the app using Easy mode.
2. Confirm authenticated authorize event, exactly one merchant workspace and
   encrypted access/refresh storage. Show field names and redacted metadata only.
3. Confirm welcome-email delivery, secure account activation and the setup guide.
4. Connect an approved WhatsApp sender and templates. Demonstrate a consented test
   campaign, an order reminder and appointment creation/change OTP. Show provider
   delivery status rather than equating queue acceptance with delivery.
5. Verify appointment eligibility policy for completed store orders and the
   optional all-customers setting. Test both allowed and rejected cases.
6. Demonstrate access-token refresh, repeat authorization delivery, and reconnect.
7. Use two demo merchants: neither can read or mutate the other's contacts,
   orders, messages, appointments, settings, invoices or integrations by URL/API ID.
8. Verify SAR119 plan purchase/activation and expiry; Meta charges are separate.
9. Uninstall: stop synchronization and pending sends for that store; retain other
   merchants' operation. Reinstall without old events restoring revoked access.
10. Verify listing description, screenshots, guide, support contacts, privacy,
    terms, data deletion and pricing reflect the functions demonstrated.

## Official references

- https://docs.salla.dev/421118m0 — OAuth modes / Easy authorization
- https://docs.salla.dev/partner-apis/app-events — authorization payload
- https://docs.salla.dev/merchants/user-info — installer versus merchant identity
- https://docs.salla.dev/playbook/launch-grow/publish-app — publishing checklist

Acceptance requires actual evidence for every row; the meeting invitation itself
is not production approval. Booking the meeting has not been performed.
