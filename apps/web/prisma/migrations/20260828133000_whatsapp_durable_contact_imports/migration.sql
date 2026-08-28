ALTER TABLE "WhatsAppContactImport"
  ADD COLUMN "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentEvidence" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "WhatsAppContactImport_id_business_unique"
  ON "WhatsAppContactImport"("id", "businessId");

ALTER TABLE "WhatsAppContactImport" DROP CONSTRAINT "WhatsAppContactImport_status_check";
ALTER TABLE "WhatsAppContactImport" ADD CONSTRAINT "WhatsAppContactImport_status_check"
  CHECK ("status" IN ('queued', 'processing', 'completed', 'completed_with_errors', 'failed'));
ALTER TABLE "WhatsAppContactImport" ADD CONSTRAINT "WhatsAppContactImport_consent_evidence_check"
  CHECK (
    ("consentConfirmed" = false AND "consentEvidence" IS NULL) OR
    ("consentConfirmed" = true AND char_length(btrim("consentEvidence")) BETWEEN 1 AND 500)
  );

-- The previous implementation was synchronous. Any legacy row still marked as
-- processing was interrupted before it could publish a result and has no durable batch.
UPDATE "WhatsAppContactImport"
SET "status" = 'failed', "completedAt" = COALESCE("completedAt", CURRENT_TIMESTAMP), "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'processing';

CREATE TABLE "WhatsAppContactImportBatch" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "batchIndex" INTEGER NOT NULL,
  "rows" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WhatsAppContactImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppContactImportBatch_import_index_unique"
  ON "WhatsAppContactImportBatch"("importId", "batchIndex");
CREATE INDEX "WhatsAppContactImportBatch_ready_idx"
  ON "WhatsAppContactImportBatch"("status", "nextAttemptAt");
CREATE INDEX "WhatsAppContactImportBatch_tenant_status_idx"
  ON "WhatsAppContactImportBatch"("businessId", "importId", "status");
CREATE INDEX "WhatsAppContactImportBatch_lease_idx"
  ON "WhatsAppContactImportBatch"("leaseExpiresAt");

ALTER TABLE "WhatsAppContactImportBatch" ADD CONSTRAINT "WhatsAppContactImportBatch_import_tenant_fkey"
  FOREIGN KEY ("importId", "businessId") REFERENCES "WhatsAppContactImport"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppContactImportBatch" ADD CONSTRAINT "WhatsAppContactImportBatch_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppContactImportBatch" ADD CONSTRAINT "WhatsAppContactImportBatch_status_check"
  CHECK ("status" IN ('queued', 'processing', 'completed', 'failed'));
ALTER TABLE "WhatsAppContactImportBatch" ADD CONSTRAINT "WhatsAppContactImportBatch_attempt_check"
  CHECK ("attemptCount" BETWEEN 0 AND 5);
ALTER TABLE "WhatsAppContactImportBatch" ADD CONSTRAINT "WhatsAppContactImportBatch_index_check"
  CHECK ("batchIndex" >= 0);
ALTER TABLE "WhatsAppContactImportBatch" ADD CONSTRAINT "WhatsAppContactImportBatch_lease_check"
  CHECK (
    ("status" = 'processing' AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL) OR
    ("status" <> 'processing' AND "leaseOwner" IS NULL AND "leaseExpiresAt" IS NULL)
  );
