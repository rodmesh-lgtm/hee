# INFRO Production Cutover Request

This marker is intentionally stored under `.github/scripts/` so the protected `RC Quality` path filter validates the exact production-cutover commit before the canonical cutover orchestrator is allowed to dispatch Production Preflight V2 and Production Web Deploy.

Approved launch request:

- Verified application merge SHA: `c4a7a7b4031cd10f65f059a7b5fd5e0b70ca127b`
- Cutover-pipeline repair merge SHA: `3fc3f9776dc41654f47ba5f0101f05aaff52515d`
- Sender-attestation repair merge SHA: `626ec9bee67392c1a8d18381407e5c06f9affe5c`
- Requested at: `2026-09-14T06:50:00Z`
- Scope: Production web release to `ir.sa` only
- Excluded: Production database migration, public paid checkout, Meta activation, and WhatsApp canary increase

It contains no executable code and changes no runtime behavior.
