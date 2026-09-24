# Salla order confirmation release — 2026-09-24

- Feature PR: #311, head `84de586598689181c74493453916460b9c156a63`.
- Candidate quality: RC Quality `35959170954` success; Dashboard Visual Audit `35959170971` success.
- Preview: `dpl_9rboHKPHynWEbaXnX7AZdBBnBbD5` READY for the candidate SHA.
- Production cutover must await green RC Quality on this release commit and Production Preflight V2.
- No database migration. The Salla confirmation workflow stays inactive until a tenant chooses an approved Utility template and a connected WhatsApp sender, records consent, and activates it.
