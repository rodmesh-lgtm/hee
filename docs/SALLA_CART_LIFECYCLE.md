# Salla cart recovery

## Official contract

Payload reference: https://docs.salla.dev/433812m0
Event listing: https://docs.salla.dev/1726838m0

Subscribe the installed Salla application to `abandoned.cart`,
`abandoned.cart.updated`, `abandoned.cart.status.changed` and
`abandoned.cart.purchased`, using the existing signed endpoint:
`https://ir.sa/api/commerce/salla/webhook`.
Do not replace the existing order or app lifecycle subscriptions.

The platform only processes verified events for an active Salla store. OAuth
order access alone does not enable cart events. Verify a real demo-store event
before declaring a merchant's cart integration active. This change does not
modify Partners Portal settings or create consent.

## Merchant configuration

1. Connect Salla through appointments/integrations.
2. Create a cart reminder template in the template editor and obtain Meta approval.
3. Create an abandoned-cart automation with that approved template and a delay.
4. Activate it only after confirming the sending number and valid marketing consent.
5. Verify the cart report and automation logs with consenting test contacts.

Current generic cart reminders use the configured template parameters; this
release does not inject a customer-specific checkout URL or create discounts.
Recovery means a purchased event was received; it does not prove revenue attribution.

## Integrity

- Store-scoped cart identities prevent collisions between tenants or stores.
- A durable, contact-independent state record handles purchase-before-abandonment.
- Purchase is terminal; late abandonment cannot reopen it.
- Repeated abandonment does not restart the reminder delay or create another event.
- No consent: cart reporting only, no scheduled marketing event.
- Opt-out and consent are checked again before delivery.
- A disconnected Salla store cannot deliver its pending cart messages.
- The new migration preserves tenant foreign keys and extends only the cart actor allowlist.
- Use the protected `[production-schema-cutover]` workflow for release.

CI runs a real PostgreSQL lifecycle audit inside a rolled-back transaction; it
does not invoke Meta or send messages.
