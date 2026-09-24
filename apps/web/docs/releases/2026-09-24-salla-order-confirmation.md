# Salla order confirmation release — 2026-09-24

- Feature PR #311: signed Salla events trigger consented Utility-template WhatsApp confirmations.
- Safeguard PR #312: select one latest active route per order to prevent duplicate confirmations across senders.
- PR #312 candidate `a488a9d9a971fa5ecb14179408b386c9927a8bcd`: RC Quality `35960435896` success; Dashboard Visual Audit `35960435883` success; preview `dpl_4eQMs4vAaRgoHD5uEMhxjdRJfiZw` READY.
- Production cutover must await green exact-head RC Quality and Production Preflight V2.
- No database migration; individual tenants must select a connected number and approved Utility template and activate the route after recording WhatsApp consent.
