# Retail analytics official integrations

This feature is not production-ready until provider authorization and end-to-end customer account tests pass. No CSV/Excel import substitutes for the requested integrations.

## Shopify

Existing OAuth integration records are reused under their business scope. The retail page is owner-only; existing visitor-analytics staff access is insufficient. Access tokens remain encrypted server-side, with tenant/account/provider bound to encryption context. GET /api/retail-analytics/shopify authenticates, resolves the active owned business, binds the request to that business, throttles reads, loads the specific active integration, and rechecks active status before returning a report.

Reporting uses the official GraphQL Admin API and no customer names, contact details or addresses. The current increment reads order cohorts by created_at in Riyadh time, up to 31 days within the latest 59 days. It is NOT a cash movement report by payment/refund date. Current order totals already reflect returns; totalRefundedSet is shown separately and must not be deducted again. Cancelled order values are excluded but their payment/refund history is retained. API failures do not become zeros. Five pages per refresh are allowed; capped reports are explicitly partial and cannot enter combined totals. Currency totals stay separate. No profit calculation without actual COGS.

Required server configuration is the existing SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_ADMIN_API_VERSION and commerce encryption configuration. The new retail callback is /api/retail-analytics/oauth/shopify/callback and must be registered before enabling this flow. Standalone owner-only retail onboarding now requests read_orders only. Existing WhatsApp commerce callbacks are unchanged. Independent commercial entitlements and uninstall/revocation lifecycle remain release blockers.

Official references:
- https://shopify.dev/docs/api/admin-graphql/latest/objects/Order
- https://shopify.dev/docs/api/usage/access-scopes

## Foodics

Official documentation retrieved 2026-11-01:
- https://apidocs.foodics.com/core/introduction
- https://apidocs.foodics.com/core/authentication
- https://apidocs.foodics.com/core/scopes
- https://apidocs.foodics.com/core/resources/whoami
- https://apidocs.foodics.com/core/resources/orders

Production API: https://api.foodics.com/v5. Sandbox: https://api-sandbox.foodics.com/v5. Authorization is OAuth2 authorization-code grant. Foodics issues the client ID/secret and defines scopes. Authorization code lifetime is 600 seconds. The official developer partnership guide confirms authorization at https://console.foodics.com/authorize (sandbox: https://console-sandbox.foodics.com/authorize) and token exchange at https://api.foodics.com/oauth/token (sandbox: https://api-sandbox.foodics.com/oauth/token). Server-only authorization-code exchange and whoami identity verification are implemented in the draft. FOODICS_ENVIRONMENT must explicitly be production or sandbox. Register /api/retail-analytics/oauth/foodics/callback with Foodics.

Minimum requested scopes for an order/branch report: orders.list and general.read. Inventory reporting requires inventory.transactions.read and inventory.settings.read as appropriate; do not request write scopes. GET /whoami supplies business.id and granted scopes: bind verified external business identity, never a user-entered business ID. Never forward owner PII returned by whoami to the dashboard.

Orders use 50-record reference pagination: sort=reference and filter[reference_after], initially 0. Do not use page=N for historical completeness: docs warn of a ten-page limit. Date/time values are UTC; business_date is an operational date and must not be confused with UTC created_at. Confirm accounting treatment of completed, returned, partially returned and void orders before aggregating. No Foodics credentials, registered INFRO app or real account authorization was available in this task; no Foodics live account is connected.

Foodics documents 90 requests/minute/token/IP. Respect Retry-After, stop on 401, and do not retry 403. The official API Adapter is a separate registration/enablement path, not proof that INFRO is already listed as an authorized entity:
https://help.foodics.com/hc/en-us/articles/7494382541084-Foodics-API-Adapter-Tenants-Revenue-System

## ICG Manager 2018

Waiting for vendor response, as requested by the owner. Do not reverse-engineer ICGDocs private endpoints or treat document portal credentials as an approved analytics integration. No database connection or schema mapping is implemented. Obtain supported integration contract, read-only scopes, account/company identifiers, licensing requirements and 2018 compatibility before building the adapter.

## Remaining verification and delivery

- Browser QA and live Shopify OAuth/report reconciliation with a customer-approved account.
- Foodics app registration, sandbox credentials, live OAuth verification and verified report adapter. OAuth code exists; no actual Foodics account is connected.
- ICG approved contract.
- Complete disconnect/revocation handling, uninstall lifecycle, commercial entitlements, scheduled synchronization, durable tenant-isolated reporting storage, product/inventory metrics and exports. Failed authorization after token issuance must have a tested vendor revocation path before release; local rejection alone does not revoke provider access.
- CI, deployment and production smoke tests; draft PR is not a production release.

## Onboarding implementation and deployment check (2026-11-01)

- Separate Shopify/Foodics forms, pending indicators, reconnect to a scoped existing integration, and explicit missing-configuration states.
- Hash-only 10-minute single-use states bound to owner, business and provider. Atomic claim, final ownership/status recheck, encrypted tokens bound to tenant/integration/provider.
- Shopify HMAC and timestamp validation; Foodics identity and scopes verified using whoami, sandbox identity namespaced separately.
- Reject callback duplicates, foreign integrations, account replacement and cross-business collisions. Never use shop or customer credentials in client-side code.
- Production environment metadata inspection found no visible SHOPIFY_CLIENT_ID/SECRET or FOODICS_CLIENT_ID/SECRET entries. Values were not decrypted. An actual connected merchant is still required for acceptance testing.
- Shopify registration: https://dev.shopify.com/dashboard — create/register INFRO app, use the retail callback, read_orders and non-embedded analytics UI. Select distribution suitable for independently owned customer stores; a custom app limited to one merchant is not a general SaaS distribution solution.
- Foodics registration: https://developers.foodics.com/guides/partnership_authentication_process — request client credentials and sandbox with orders.list/general.read, plus tokens.limited.revoke for official disconnect. No registration email sent by this change.
- Canonical planned install URL: https://ir.sa/dashboard/retail-analytics (requires INFRO owner sign-in). These routes are draft until PR475 is deployed.
