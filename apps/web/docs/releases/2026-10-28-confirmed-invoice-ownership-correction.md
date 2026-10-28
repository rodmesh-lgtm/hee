# Confirmed invoice ownership correction

The platform owner explicitly confirmed that the four invoices stored under the
workshop belong to the laundry. Administrative production preflight found four
tickets, one customer, two payments and seven journals; no related prepaid,
delivery, reconciliation, contract, live order link or notice events.

This incident-specific administrative action has a frozen source/destination and
four-record manifest. It requires verified admin authentication and the accounting
security hold. It is not a general customer-facing transfer feature.

- Serializable atomic transaction; source/destination advisory locks in stable order.
- Preserves original invoice/payment IDs, amounts, creator and original timestamps.
  Conflicting destination invoice numbers receive the next per-business numbers;
  original references and complete source rows remain in a private backup table.
- Validated foreign keys remain enabled. Temporary parent rows exist only inside
  the atomic transaction while payment references move and are removed before commit.
- Original posted journals remain immutable. Balanced reversal journals neutralize
  the incorrect business; exact corresponding entries post to the correct business.
- Referenced services map to an exact destination catalogue match or a scoped copy.
  Customer profiles consolidate by phone without overwriting existing destination
  profiles; conflicting address/notes require manual review.
- Old notice consent is not transferred. Historical consent audits are archived as
  prior evidence; ready-notice consent becomes null.
- Recovery uses a canonical checksum of a private database snapshot and an admin
  undo action. Undo refuses later record changes; it reverses correction postings
  and restores original invoice/customer/service ownership atomically.
- Already applied requests replay without duplicating invoices or journals.
- Matching destination invoice candidates, closed periods, unexpected dependencies,
  ledger discrepancies and posting conflicts fail closed with no partial data changes.

Tests execute the actual correction and undo SQL against PostgreSQL-compatible
PGlite with real composite foreign keys, immutable journal triggers and deferred
journal balance checks. They cover conservation, replay, contact consolidation,
recovery, closed periods, changed dependencies, later edits, duplicate candidates,
and admin/hold authorization. No production financial data is used in tests.

Publishing the action is not applying it. Actual application and post-operation
source/destination totals must be verified in the administrative UI. The hold is
not automatically lifted by this correction.
