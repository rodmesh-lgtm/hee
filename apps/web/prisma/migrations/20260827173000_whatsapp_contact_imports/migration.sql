CREATE TABLE "WhatsAppContactImport" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileSha256" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "totalRows" INTEGER NOT NULL,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "duplicateRows" INTEGER NOT NULL DEFAULT 0,
  "rejectedRows" INTEGER NOT NULL DEFAULT 0,
  "errorSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WhatsAppContactImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppContactImport_business_file_unique" ON "WhatsAppContactImport"("businessId", "fileSha256");
CREATE INDEX "WhatsAppContactImport_business_created_idx" ON "WhatsAppContactImport"("businessId", "createdAt");
CREATE INDEX "WhatsAppContactImport_status_created_idx" ON "WhatsAppContactImport"("status", "createdAt");

ALTER TABLE "WhatsAppContactImport" ADD CONSTRAINT "WhatsAppContactImport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppContactImport" ADD CONSTRAINT "WhatsAppContactImport_format_check" CHECK ("format" IN ('csv', 'xlsx'));
ALTER TABLE "WhatsAppContactImport" ADD CONSTRAINT "WhatsAppContactImport_status_check" CHECK ("status" IN ('processing', 'completed', 'completed_with_errors', 'failed'));
ALTER TABLE "WhatsAppContactImport" ADD CONSTRAINT "WhatsAppContactImport_counts_check" CHECK (
  "totalRows" >= 0 AND
  "importedRows" >= 0 AND
  "duplicateRows" >= 0 AND
  "rejectedRows" >= 0 AND
  "importedRows" + "duplicateRows" + "rejectedRows" <= "totalRows"
);
