# INFRO360 location reporting readiness

Production defaults to requesting the existing Shopify scopes. Location reporting is opt-in to avoid breaking the approved app configuration or current connections.

1. In the official Shopify app configuration, add the read-only `read_locations` scope and release that configuration. Reference: https://shopify.dev/docs/api/admin-graphql/latest/objects/Location
2. Only after verifying the provider configuration, enable `SHOPIFY_RETAIL_LOCATIONS_ENABLED=true` in the appropriate deployment environment and deploy. This flag only changes new OAuth requests; it does not grant access or modify existing grants.
3. Test with an authorized store. Confirm the encrypted credential records `read_locations`, the API response reports `locationsReadable:true`, and known POS orders contain their sales location. Online orders may legitimately have no location. Never substitute fulfillment locations.
4. Existing active connections are not disconnected by this release. In-place scope upgrades still need a dedicated OAuth upgrade flow; do not revoke a merchant's working connection just to request this scope. Keep the flag off if the official app setup cannot be verified.
5. Verify cross-tenant denial and missing-permission behavior. Even an empty order report without location permission must not be labeled a complete branch comparison.

Peer insights are deterministic review signals, not AI predictions, profit estimates, or causal claims. They use a same-currency peer median excluding the subject, at least two other participants, and minimum sample sizes stated in the UI. No additional provider calls or external data sharing are introduced.
