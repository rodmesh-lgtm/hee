-- Track whether the account owner has proved control of the login email.
-- Existing accounts intentionally remain unverified; pre-launch owners can verify through
-- the new email-verification flow instead of inheriting trust from unverified registration.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE INDEX "User_emailVerifiedAt_idx" ON "User"("emailVerifiedAt");
