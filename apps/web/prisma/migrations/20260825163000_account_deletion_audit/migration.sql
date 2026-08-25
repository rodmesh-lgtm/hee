CREATE TABLE "AccountDeletionAudit" (
  "id" TEXT NOT NULL,
  "deletionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountDeletionAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountDeletionAudit_deletionId_key" ON "AccountDeletionAudit"("deletionId");
CREATE INDEX "AccountDeletionAudit_userId_idx" ON "AccountDeletionAudit"("userId");
CREATE INDEX "AccountDeletionAudit_completedAt_idx" ON "AccountDeletionAudit"("completedAt");

-- Intentionally no FK to User: the audit must remain independently durable even if a
-- future approved retention process hard-erases the anonymized User row.
