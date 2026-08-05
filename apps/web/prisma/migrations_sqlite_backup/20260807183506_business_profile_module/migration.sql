-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "planId" TEXT,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "website" TEXT,
    "country" TEXT,
    "city" TEXT,
    "district" TEXT,
    "googleMapsLink" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#5D43EF',
    "secondaryColor" TEXT,
    "buttonColor" TEXT,
    "workingHours" TEXT,
    "deliveryAvailable" BOOLEAN NOT NULL DEFAULT false,
    "bookingAvailable" BOOLEAN NOT NULL DEFAULT false,
    "acceptOnlineOrders" BOOLEAN NOT NULL DEFAULT false,
    "xUrl" TEXT,
    "instagramUrl" TEXT,
    "snapchatUrl" TEXT,
    "tiktokUrl" TEXT,
    "facebookUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Business_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BusinessPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Business" ("address", "businessType", "city", "coverUrl", "createdAt", "deletedAt", "description", "id", "isPublished", "isVerified", "logoUrl", "name", "ownerId", "phone", "planId", "primaryColor", "slug", "updatedAt", "whatsapp") SELECT "address", "businessType", "city", "coverUrl", "createdAt", "deletedAt", "description", "id", "isPublished", "isVerified", "logoUrl", "name", "ownerId", "phone", "planId", "primaryColor", "slug", "updatedAt", "whatsapp" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");
CREATE INDEX "Business_planId_idx" ON "Business"("planId");
CREATE INDEX "Business_slug_idx" ON "Business"("slug");
CREATE INDEX "Business_isPublished_idx" ON "Business"("isPublished");
CREATE INDEX "Business_deletedAt_idx" ON "Business"("deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
