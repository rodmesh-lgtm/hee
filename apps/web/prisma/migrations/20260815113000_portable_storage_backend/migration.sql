-- Track where each stored object physically lives so the application can migrate
-- from database bytes to an S3-compatible object store without changing public URLs.
ALTER TABLE "StoredObject"
  ADD COLUMN "storageDriver" TEXT NOT NULL DEFAULT 'database';

ALTER TABLE "StoredObject"
  ALTER COLUMN "data" DROP NOT NULL;

CREATE INDEX "StoredObject_storageDriver_idx" ON "StoredObject"("storageDriver");
