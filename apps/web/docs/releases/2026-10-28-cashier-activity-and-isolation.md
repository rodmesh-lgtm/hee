# Cashier activity and isolation release

Cashier behavior follows the authenticated business's declared category/type and
its own saved catalogue. Specific activity metadata takes precedence over legacy
clothing catalogue evidence. No catalogue or profile is inferred from another
business or its name.

- Laundry: normal/urgent menu prices stay per business. Urgent due shortcuts offer
  one/two/four hours; normal offers four hours/next day/two days. A due shortcut
  never changes prices implicitly. The operator can choose a custom day/time.
- Workshop: repair/parts menu, expected vehicle readiness, next-day/two/three-day
  shortcuts and optional model, plate and mileage fields. Vehicle values are
  validated again on the server and persist with this invoice's notes.
- Car wash, restaurant, shop, salon and clinic get appropriate readiness/service
  terminology and short-time choices. Urgency is off by default outside laundry;
  a business owner may explicitly enable it for their own activity.
- Shared contracts, reports and standard ledger labels say business rather than
  laundry. Custom account names remain unchanged.
- New workflow controls have Arabic/English/Chinese/Spanish/Urdu translations.
- Switching business invalidates accounting layouts. Login/logout clears the
  previous account's host/shared business preference; session cookies remain
  host-only. A selected inaccessible business never falls back silently.

The owner-confirmed four-record invoice correction was applied and verified in
production separately. Source has zero transferred tickets/customers/payments;
correct destination has thirteen invoices, including corrected numbers10–13.
Original posted journals and a private checksum-protected recovery snapshot remain.
Old messaging consent was not transferred.

The candidate lifts the temporary global accounting hold only after isolated
PostgreSQL/browser verification. The Cashier Tenant Isolation workflow builds the
exact candidate with no production credentials and exercises independent workshop,
laundry and restricted-staff sessions, real server-action reads/writes, forged
business/ticket IDs, invoice display, activity fields, urgent prices/deadlines,
invalid selected context and cleared authentication.

Existing unit tests also cover actual SQL ownership correction/undo, balanced
ledger conservation, duplicate candidates, closed periods and changed dependencies.
Production rollback of the historical ownership correction requires re-entering
accounting containment first; the recovery control explains this safeguard.
