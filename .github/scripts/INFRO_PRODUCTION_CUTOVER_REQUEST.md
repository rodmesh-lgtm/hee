# INFRO Production Cutover Request

This marker is intentionally stored under `.github/scripts/` so the protected `RC Quality` path filter validates the exact production-cutover commit before the canonical cutover orchestrator is allowed to dispatch Production Preflight V2 and Production Web Deploy.

Approved launch request:

- Candidate merge SHA: `48c6e3b087e5711084bba0773aeebc5e8e943191`
- Requested at: `2026-09-10T02:35:00Z`
- Scope: Production web release to `ir.sa` only
- Excluded: Production database migration, public paid checkout, Meta activation, and WhatsApp canary increase

It contains no executable code and changes no runtime behavior.
