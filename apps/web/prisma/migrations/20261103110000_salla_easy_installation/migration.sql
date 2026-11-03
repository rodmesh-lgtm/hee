-- CreateTable
CREATE TABLE "SallaEasyInstallation" (
    "merchantId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provisionedUser" BOOLEAN NOT NULL DEFAULT false,
    "authorizedAt" TIMESTAMP(3) NOT NULL,
    "eventDigest" TEXT NOT NULL,
    "claimHash" TEXT,
    "claimExpiresAt" TIMESTAMP(3),
    "claimEnvelope" JSONB,
    "claimedAt" TIMESTAMP(3),
    "welcomeStatus" TEXT NOT NULL DEFAULT 'pending',
    "welcomeAttempts" INTEGER NOT NULL DEFAULT 0,
    "welcomeNextAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "welcomeLeaseUntil" TIMESTAMP(3),
    "welcomeSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SallaEasyInstallation_pkey" PRIMARY KEY ("merchantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SallaEasyInstallation_integrationId_key" ON "SallaEasyInstallation"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "SallaEasyInstallation_claimHash_key" ON "SallaEasyInstallation"("claimHash");

-- CreateIndex
CREATE INDEX "SallaEasyInstallation_welcomeStatus_welcomeNextAt_idx" ON "SallaEasyInstallation"("welcomeStatus", "welcomeNextAt");

-- CreateIndex
CREATE UNIQUE INDEX "SallaEasyInstallation_integration_business_unique" ON "SallaEasyInstallation"("integrationId", "businessId");

-- AddForeignKey
ALTER TABLE "SallaEasyInstallation" ADD CONSTRAINT "SallaEasyInstallation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SallaEasyInstallation" ADD CONSTRAINT "SallaEasyInstallation_integrationId_businessId_fkey" FOREIGN KEY ("integrationId", "businessId") REFERENCES "WhatsAppCommerceIntegration"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SallaEasyInstallation" ADD CONSTRAINT "SallaEasyInstallation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

