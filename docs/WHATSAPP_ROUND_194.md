# WhatsApp Round 194

This round hardens the customer-facing WhatsApp marketing section before the first real campaign.

- Campaign enqueue now fails closed when the selected Meta connection is no longer connected or was disabled.
- Campaign enqueue now fails closed when the selected Meta template is no longer approved.
- Campaign enqueue now fails closed when the campaign snapshot is empty.
- These checks run inside the same serializable transaction that creates delivery jobs.
- Consent and opt-out filtering remains enforced before queue insertion and again at the send boundary.
- First real campaign canary remains business-wide and limited to at most five attempts until Meta confirms Delivered or Read.
- Campaign UI now distinguishes successful canary states from failures and gives safe actionable failure messages.
- WhatsApp dashboard cards expose real readiness derived from database state instead of implying that every section is already operational.
- Shopify is the only commerce provider presented as having an official active lifecycle; Salla and Zid remain draft-only until their official adapters are complete.

No Production database migration is introduced by this round.
