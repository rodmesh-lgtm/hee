CREATE TABLE "LiveViewConnector" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "activity" TEXT NOT NULL DEFAULT 'other', "pairingHash" TEXT, "pairingExpiresAt" TIMESTAMP(3),
  "tokenHash" TEXT, "enrolledAt" TIMESTAMP(3), "lastSeenAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3), "agentVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveViewConnector_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LiveViewConnector_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LiveViewConnector_id_businessId_key" ON "LiveViewConnector"("id", "businessId");
CREATE UNIQUE INDEX "LiveViewConnector_pairingHash_key" ON "LiveViewConnector"("pairingHash");
CREATE UNIQUE INDEX "LiveViewConnector_tokenHash_key" ON "LiveViewConnector"("tokenHash");
CREATE INDEX "LiveViewConnector_businessId_createdAt_idx" ON "LiveViewConnector"("businessId", "createdAt");
ALTER TABLE "LiveViewStation"
  ADD COLUMN "connectorId" TEXT,
  ADD COLUMN "cameraBrand" TEXT,
  ADD COLUMN "cameraModel" TEXT,
  ADD COLUMN "deviceType" TEXT,
  ADD COLUMN "cameraHost" TEXT,
  ADD COLUMN "cameraPort" INTEGER NOT NULL DEFAULT 554,
  ADD COLUMN "cameraChannel" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "cameraProfile" TEXT NOT NULL DEFAULT 'sub',
  ADD COLUMN "cameraPath" TEXT,
  ADD COLUMN "credentialEnvelope" TEXT,
  ADD COLUMN "configVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "probeNonce" TEXT,
  ADD COLUMN "inputStatus" TEXT NOT NULL DEFAULT 'unconfigured',
  ADD COLUMN "inputCheckedAt" TIMESTAMP(3),
  ADD CONSTRAINT "LiveViewStation_connectorId_businessId_fkey" FOREIGN KEY ("connectorId", "businessId") REFERENCES "LiveViewConnector"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "LiveViewStation_camera_port_check" CHECK ("cameraPort" BETWEEN 1 AND 65535),
  ADD CONSTRAINT "LiveViewStation_camera_channel_check" CHECK ("cameraChannel" BETWEEN 1 AND 256);
CREATE INDEX "LiveViewStation_connectorId_businessId_idx" ON "LiveViewStation"("connectorId", "businessId");
