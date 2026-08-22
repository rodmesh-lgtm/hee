-- Persist the last successful end-to-end billing operations run. Production checkout
-- uses this as a liveness signal in addition to the explicit operator readiness flag.
CREATE TABLE "BillingOperationsHeartbeat" (
  "id" TEXT NOT NULL,
  "lastSucceededAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingOperationsHeartbeat_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingOperationsHeartbeat_singleton" CHECK ("id" = 'billing-operations')
);
