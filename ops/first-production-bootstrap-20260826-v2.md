# First isolated HEE Production bootstrap

One-time trigger after Round 135 database isolation and canonical-domain routing repair.

Safety invariants:
- Production source database resolves to `hee_production`.
- Restore database resolves to `hee_restore_production`.
- Both databases were confirmed empty immediately before this trigger.
- The unrelated `neondb` schema must never be mutated by HEE workflows.
- Billing renewal, billing operations readiness, public paid checkout, and rehearsal access remain disabled during bootstrap.
