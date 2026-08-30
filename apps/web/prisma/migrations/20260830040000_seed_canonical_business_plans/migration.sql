-- Keep the canonical subscription catalog in every environment, including
-- Production where `prisma db seed` is intentionally not part of web deploys.
-- Existing plan ids are preserved so subscriptions and access-code grants keep
-- their foreign-key lineage.
INSERT INTO "BusinessPlan" (
  "id",
  "code",
  "name",
  "monthlyPrice",
  "productLimit",
  "aiEnabled",
  "onlinePay",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'FREE', 'Free', 0, 3, false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000002', 'BUSINESS', 'Business', 199, 10, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000003', 'PRO', 'Pro', 399, 30, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "monthlyPrice" = EXCLUDED."monthlyPrice",
  "productLimit" = EXCLUDED."productLimit",
  "aiEnabled" = EXCLUDED."aiEnabled",
  "onlinePay" = EXCLUDED."onlinePay",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
