CREATE TABLE "BusinessNote" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessNote_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BusinessNote"
ADD CONSTRAINT "BusinessNote_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "BusinessNote_id_business_unique" ON "BusinessNote"("id", "businessId");
CREATE INDEX "BusinessNote_business_pin_sort_idx" ON "BusinessNote"("businessId", "isPinned", "sortOrder", "updatedAt");

ALTER TABLE "BusinessNote"
ADD CONSTRAINT "BusinessNote_title_length_check" CHECK (char_length("title") BETWEEN 1 AND 160),
ADD CONSTRAINT "BusinessNote_body_length_check" CHECK (char_length("body") BETWEEN 1 AND 8000),
ADD CONSTRAINT "BusinessNote_sort_order_check" CHECK ("sortOrder" BETWEEN -100000 AND 100000);