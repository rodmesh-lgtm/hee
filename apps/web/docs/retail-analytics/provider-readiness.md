# Retail analytics official integrations

This feature is not production-ready until provider authorization and end-to-end customer account tests pass. No CSV/Excel import substitutes for the requested integrations.

## Shopify

Existing OAuth integration records are reused under their business scope. The retail page is owner-only; existing visitor-analytics staff access is insufficient. Access tokens remain encrypted server-side, with tenant/account/provider bound to encryption context. GET /api/retail-analytics/shopify authenticates, resolves the active owned business, binds the request to that business, throttles reads, loads the specific active integration, and rechecks active status before returning a report.

Reporting uses the official GraphQL Admin API and no customer names, contact details or addresses. The current increment reads order cohorts by created_at in Riyadh time, up to 31 days within the latest 59 days. It is NOT a cash movement report by payment/refund date. Current order totals already reflect returns; totalRefundedSet is shown separately and must not be deducted again. Cancelled order values are excluded but their payment/refund history is retained. API failures do not become zeros. Five pages per refresh are allowed; capped reports are explicitly partial and cannot enter combined totals. Currency totals stay separate. No profit calculation without actual COGS.

Required server configuration is the existing SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_ADMIN_API_VERSION and commerce encryption configuration. The app callback is the existing /api/whatsapp/commerce/shopify/callback. Existing connection management/entitlement flow is unchanged. Standalone retail onboarding and an independent commercial entitlement remain to be implemented; do not advertise them as delivered.

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

Production API: https://api.foodics.com/v5. Sandbox: https://api-sandbox.foodics.com/v5. Authorization is OAuth2 authorization-code grant. Foodics issues the client ID/secret and defines scopes. Authorization code lifetime is 600 seconds. Verify the actual authorization/token endpoint origins and approved redirect with the registered app before implementation; documentation's generic URL placeholders are not endpoint confirmation.

Minimum requested scopes for an order/branch report: orders.list and general.read. Inventory reporting requires inventory.transactions.read and inventory.settings.read as appropriate; do not request write scopes. GET /whoami supplies business.id and granted scopes: bind verified external business identity, never a user-entered business ID. Never forward owner PII returned by whoami to the dashboard.

Orders use 50-record reference pagination: sort=reference and filter[reference_after], initially 0. Do not use page=N for historical completeness: docs warn of a ten-page limit. Date/time values are UTC; business_date is an operational date and must not be confused with UTC created_at. Confirm accounting treatment of completed, returned, partially returned and void orders before aggregating. No Foodics credentials, registered INFRO app or real account authorization was available in this task; no Foodics live account is connected.

Foodics documents 90 requests/minute/token/IP. Respect Retry-After, stop on 401, and do not retry 403. The official API Adapter is a separate registration/enablement path, not proof that INFRO is already listed as an authorized entity:
https://help.foodics.com/hc/en-us/articles/7494382541084-Foodics-API-Adapter-Tenants-Revenue-System

## ICG Manager 2018

Waiting for vendor response, as requested by the owner. Do not reverse-engineer ICGDocs private endpoints or treat document portal credentials as an approved analytics integration. No database connection or schema mapping is implemented. Obtain supported integration contract, read-only scopes, account/company identifiers, licensing requirements and 2018 compatibility before building the adapter.

## Remaining verification and delivery

- Browser QA and live Shopify OAuth/report reconciliation with a customer-approved account.
- Foodics app registration, sandbox credentials, OAuth flow and verified report adapter.
- ICG approved contract.
- Dedicated retail account onboarding/permissions, scheduled synchronization, durable tenant-isolated reporting storage, product/inventory metrics and exports.
- CI, deployment and production smoke tests; draft PR is not a production release.
