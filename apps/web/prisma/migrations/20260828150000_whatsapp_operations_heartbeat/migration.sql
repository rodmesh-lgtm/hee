CREATE TABLE "WhatsAppOperationsHeartbeat" (
    "id" TEXT NOT NULL,
    "lastStartedAt" TIMESTAMP(3) NOT NULL,
    "lastSucceededAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "releaseSha" TEXT,
    "lastErrorCode" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppOperationsHeartbeat_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WhatsAppOperationsHeartbeat_release_sha_check"
      CHECK ("releaseSha" IS NULL OR "releaseSha" ~ '^[0-9a-f]{40}$'),
    CONSTRAINT "WhatsAppOperationsHeartbeat_error_code_check"
      CHECK ("lastErrorCode" IS NULL OR "lastErrorCode" ~ '^[A-Z0-9_]{1,100}$')
);
