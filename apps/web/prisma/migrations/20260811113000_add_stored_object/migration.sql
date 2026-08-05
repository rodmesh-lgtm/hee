-- Create persistent object storage table for serverless-safe uploads.
CREATE TABLE "StoredObject" (
  "id" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "folder" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoredObject_objectKey_key" ON "StoredObject"("objectKey");
CREATE INDEX "StoredObject_folder_idx" ON "StoredObject"("folder");
CREATE INDEX "StoredObject_createdAt_idx" ON "StoredObject"("createdAt");
