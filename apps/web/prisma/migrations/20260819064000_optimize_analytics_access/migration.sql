-- Dashboard analytics always scopes by business and a recent time window.
-- Public/admin event workflows also commonly scope by business + event type.
-- Composite indexes avoid scanning global event history as HEE grows.

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_businessId_createdAt_idx"
  ON "AnalyticsEvent"("businessId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_businessId_eventType_createdAt_idx"
  ON "AnalyticsEvent"("businessId", "eventType", "createdAt" DESC);
