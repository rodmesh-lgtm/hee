CREATE TABLE "SubscriptionAccessCode" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "label" TEXT,
  "planId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "maxRedemptions" INTEGER,
  "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionAccessCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionAccessCode_redemption_bounds" CHECK ("redemptionCount" >= 0 AND ("maxRedemptions" IS NULL OR "maxRedemptions" > 0))
);

CREATE TABLE "SubscriptionAccessGrant" (
  "id" TEXT NOT NULL,
  "codeId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "redeemedByUserId" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionAccessCode_codeHash_key" ON "SubscriptionAccessCode"("codeHash");
CREATE INDEX "SubscriptionAccessCode_active_idx" ON "SubscriptionAccessCode"("isActive", "expiresAt");
CREATE UNIQUE INDEX "SubscriptionAccessGrant_code_business_key" ON "SubscriptionAccessGrant"("codeId", "businessId");
CREATE INDEX "SubscriptionAccessGrant_business_active_idx" ON "SubscriptionAccessGrant"("businessId", "revokedAt");
CREATE INDEX "SubscriptionAccessGrant_subscription_idx" ON "SubscriptionAccessGrant"("subscriptionId");

ALTER TABLE "SubscriptionAccessCode" ADD CONSTRAINT "SubscriptionAccessCode_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BusinessPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAccessCode" ADD CONSTRAINT "SubscriptionAccessCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAccessGrant" ADD CONSTRAINT "SubscriptionAccessGrant_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "SubscriptionAccessCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAccessGrant" ADD CONSTRAINT "SubscriptionAccessGrant_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAccessGrant" ADD CONSTRAINT "SubscriptionAccessGrant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BusinessPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAccessGrant" ADD CONSTRAINT "SubscriptionAccessGrant_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAccessGrant" ADD CONSTRAINT "SubscriptionAccessGrant_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
