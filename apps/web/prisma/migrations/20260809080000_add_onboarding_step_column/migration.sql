-- AlterTable
ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "onboardingStep" TEXT DEFAULT 'account_created';
