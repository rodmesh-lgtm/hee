# Accounting privacy incident containment

Customer report: invoices/contact details appear in another business's accounting UI.
Historical ownership has NOT been established. Prior catalogue filtering is not a
resolution of this report. No production financial data has been deleted, moved,
or silently attributed to a different business in this release.

## Containment

- Source-controlled accounting hold denies all customer financial sections in the
  central server resolver, including direct Server Action reads/writes and legacy
  accounting pages. Parent and cashier entry points also stop before private reads.
- Final pre-send queries for ready notices and cashier followups fail closed; ready
  scheduling stops. This affects accounting notices, not unrelated commerce flows.
- Inaccessible explicitly selected businesses no longer fall back to a different
  owned business in private resolvers. Navigation preferences are not credentials.
- Private accounting/admin diagnostic responses have no-store cache policy.
- Admin-only /admin/accounting-security displays latest 500 per-business ticket
  provenance metadata, without names, phones, line descriptions or amounts. It
  checks creator/audit, customer/service/payment tenant linkage. It changes no data.

## Verification performed

1,302 Node tests pass, including executing the provenance SQL against PGlite with
intentionally mismatched tenant references and SQL injection input. Existing query
isolation checks remain exercised independently of the incident hold. TypeScript
and scoped ESLint checks pass.

## Required before lifting the hold

- Use an authenticated administrative session to inspect real affected records and
  their original businessId, createdBy, creation audit, customer and catalogue links.
- Determine whether the report is a cross-tenant read, historical wrong attribution,
  shared account/context, or more than one cause. Do not infer ownership from item
  names, phone overlap, logo, or current staff membership alone.
- Preserve evidence and prepare a reviewable correction for confirmed misattribution;
  reconcile payments, prepaid balances, ledger and notice recipients together.
- Exercise two independent authenticated business accounts end to end: create,
  list/search, detail/print, payments, customer lookup/import, reports, exports,
  subscriptions, staff access, account switch/logout and replay of foreign IDs.
- Check queued accounting notices before any resumption. Customer-editable settings,
  request values and cookies must never lift this hold.
- Only publish a reviewed release removing the hold after the above is verified.

Production data verification is pending administrative authentication. Successful
unit/build/deployment checks establish containment behavior, not historic ownership
or completion of the incident investigation.
