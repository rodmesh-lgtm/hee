CREATE TABLE "LiveViewStation" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "location" TEXT NOT NULL, "kind" TEXT NOT NULL DEFAULT 'bay', "streamKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true, "lastCheckedAt" TIMESTAMP(3),
  "lastOnline" BOOLEAN NOT NULL DEFAULT false, "reuseAfterAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveViewStation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LiveViewStation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LiveViewStation_kind_check" CHECK ("kind" IN ('bay','room','area'))
);
CREATE UNIQUE INDEX "LiveViewStation_streamKey_key" ON "LiveViewStation"("streamKey");
CREATE UNIQUE INDEX "LiveViewStation_id_businessId_key" ON "LiveViewStation"("id", "businessId");
CREATE INDEX "LiveViewStation_businessId_createdAt_idx" ON "LiveViewStation"("businessId", "createdAt");
CREATE TABLE "LiveViewSession" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "stationId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL, "reference" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveViewSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LiveViewSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LiveViewSession_stationId_businessId_fkey" FOREIGN KEY ("stationId", "businessId") REFERENCES "LiveViewStation"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LiveViewSession_expiry_check" CHECK ("expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + INTERVAL '24 hours')
);
CREATE UNIQUE INDEX "LiveViewSession_tokenHash_key" ON "LiveViewSession"("tokenHash");
CREATE INDEX "LiveViewSession_businessId_createdAt_idx" ON "LiveViewSession"("businessId", "createdAt");
CREATE INDEX "LiveViewSession_stationId_endedAt_idx" ON "LiveViewSession"("stationId", "endedAt");
-- Expired leases are explicitly closed under the station lock before reuse.
-- PostgreSQL enforces exclusivity even if concurrent application instances race.
CREATE UNIQUE INDEX "LiveViewSession_one_open_per_station" ON "LiveViewSession"("stationId") WHERE "endedAt" IS NULL;
