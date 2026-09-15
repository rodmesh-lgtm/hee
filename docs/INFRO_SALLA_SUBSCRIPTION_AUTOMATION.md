# INFRO Salla Subscription Automation

## Goal
Add a tenant-safe INFRO Commerce Automation flow where a business connects Salla, maps a Salla product to a subscription batch, assigns one shared subscription start date, and sends an approved WhatsApp template automatically after confirmed payment.

## Flow
Salla OAuth -> verified payment webhook -> tenant/integration lookup -> product mapping -> subscription batch -> idempotent enrollment -> WhatsApp template queue -> scheduled activation.

## Required entities
- Salla connection: reuse WhatsAppCommerceIntegration scoped by businessId.
- SubscriptionBatch: businessId, integrationId, externalProductId, name, capacity, startAt, durationDays, templateId, status.
- SubscriptionEnrollment: businessId, batchId, externalOrderId, externalCustomerId, phone, purchasedAt, startAt, endAt, status.
- SallaWebhookEvent: durable idempotent inbox with businessId/integrationId/event id and processing state.

## Safety gates
- Never activate Salla by manually entering credentials.
- OAuth state must be one-time, expiring and tenant-bound.
- Verify Salla webhook authenticity before processing.
- Unique event/order constraints prevent duplicate enrollment/message sends.
- All mutations must include businessId.
- WhatsApp sends reuse existing consent, template approval, WABA binding, queue, rate-limit and audit protections.
- Refund/cancel events must not silently leave an active enrollment.
- Production migration/deployment requires RC Quality, matching READY preview and explicit approval.

## Customer UI
Dashboard > WhatsApp > Integrations > Salla > Subscription batches.
Each batch shows product, capacity/sold/remaining, start date, duration, WhatsApp template and state. Creating a batch is disabled until the Salla connection and webhook lifecycle are operational.

## MVP
1. Official Salla OAuth and token lifecycle.
2. Signed/idempotent webhook inbox for paid/cancel/refund events.
3. Product-to-batch mapping.
4. Enrollment creation only after confirmed payment.
5. Approved WhatsApp confirmation template containing subscription start date.
6. Scheduler transition SCHEDULED -> ACTIVE -> EXPIRED.
7. Tenant-scoped audit and operational status UI.
