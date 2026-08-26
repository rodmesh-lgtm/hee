CREATE TABLE "RequestRateLimit" (
  "key" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RequestRateLimit_updatedAt_idx" ON "RequestRateLimit"("updatedAt");
