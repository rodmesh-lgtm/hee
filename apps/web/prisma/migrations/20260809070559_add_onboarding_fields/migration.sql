-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "businessCategory" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
