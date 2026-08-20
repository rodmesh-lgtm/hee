-- Preserve explicit Terms/Privacy acceptance independently from mutable account profile data.
-- Future policy versions can append new consent rows without overwriting historical proof.
CREATE TABLE "LegalConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "privacyVersion" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'registration',
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalConsent_user_versions_key"
  ON "LegalConsent"("userId", "termsVersion", "privacyVersion");
CREATE INDEX "LegalConsent_userId_idx" ON "LegalConsent"("userId");
CREATE INDEX "LegalConsent_acceptedAt_idx" ON "LegalConsent"("acceptedAt");

ALTER TABLE "LegalConsent"
  ADD CONSTRAINT "LegalConsent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
