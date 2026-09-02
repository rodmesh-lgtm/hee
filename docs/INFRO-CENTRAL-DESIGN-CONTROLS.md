# INFRO central design controls

The central administration dashboard is the source of truth for platform presentation. The implementation must expose the following controls to authorized platform administrators without requiring a deployment.

## Brand
- Arabic and English platform names.
- Primary logo, dark-background logo, favicon, and social/OpenGraph image.
- Primary, secondary, accent, background and foreground colors.

## Site chrome
- Header background/foreground, logo, navigation visibility/order, CTA label/link.
- Footer background/foreground, columns, legal links, social links and copyright copy.

## Public site
- Homepage section visibility and ordering.
- Hero copy and media.
- Section headings/copy/CTA links.
- Shared visual tokens: radius, surface, border and brand gradient.

## Customer pages
- Platform-level defaults for customer pages.
- Ability to enable/disable platform branding.
- Default customer-page palette and shared header/footer presentation.
- Customer-specific content remains tenant scoped and must never leak across tenants.

## SEO
- Arabic and English title/description.
- Keywords.
- Canonical base URL.
- OpenGraph image.
- robots index/follow switches.
- Structured-data organization identity.

## Safety and permissions
- Read access requires central-admin authorization.
- Mutation requires a dedicated platform-design permission, not merely customer-dashboard access.
- Writes are schema validated and audited with actor, timestamp and before/after values.
- Logo/media uploads use the existing safe upload/storage path; arbitrary HTML or script is never accepted.
- Preview and publish are separate operations so an incomplete draft cannot change production accidentally.
- A restore-default action always returns to the approved INFRO identity.

## Delivery rule
Every public, customer-dashboard and central-admin surface should consume semantic brand tokens. Legacy literal indigo/violet/purple values are compatibility-only and should be removed progressively after visual parity is verified.
