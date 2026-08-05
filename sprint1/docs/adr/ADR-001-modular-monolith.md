# ADR-001: Modular Monolith

Status: Accepted

HEE will use one deployable backend with strict modules and one PostgreSQL database.

Reasons:
- Faster launch
- Easier transactions
- Lower infrastructure complexity
- Modules can later be extracted
