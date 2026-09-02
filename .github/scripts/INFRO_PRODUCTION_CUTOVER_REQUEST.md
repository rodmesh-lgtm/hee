# INFRO Production Cutover Request

This marker is intentionally stored under `.github/scripts/` so the protected `RC Quality` path filter validates the exact production-cutover commit before the canonical cutover orchestrator is allowed to dispatch Production Preflight V2 and Production Web Deploy.

It contains no executable code and changes no runtime behavior.
