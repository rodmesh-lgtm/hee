CREATE TABLE "WhatsAppServiceBot" (
  "connectionId" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "enabledAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("connectionId", "businessId") REFERENCES "WhatsAppConnection"("id", "businessId") ON DELETE RESTRICT,
  UNIQUE ("connectionId", "businessId"),
  CHECK (jsonb_typeof("config") = 'object'),
  CHECK (NOT "enabled" OR "enabledAt" IS NOT NULL)
);
CREATE TABLE "WhatsAppBotTurn" (
  "messageId" TEXT PRIMARY KEY REFERENCES "WhatsAppMessage"("id") ON DELETE RESTRICT,
  "businessId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processing' CHECK ("status" IN ('processing','queued','handoff','skipped','failed')),
  "replyJobId" TEXT UNIQUE REFERENCES "WhatsAppReplyJob"("id") ON DELETE RESTRICT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  FOREIGN KEY ("connectionId", "businessId") REFERENCES "WhatsAppServiceBot"("connectionId", "businessId") ON DELETE RESTRICT,
  FOREIGN KEY ("conversationId", "businessId") REFERENCES "WhatsAppConversation"("id", "businessId") ON DELETE RESTRICT
);
CREATE INDEX "WhatsAppBotTurn_daily_idx" ON "WhatsAppBotTurn"("businessId", "connectionId", "createdAt");
CREATE TABLE "WhatsAppBotHandoff" (
  "conversationId" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("conversationId", "businessId") REFERENCES "WhatsAppConversation"("id", "businessId") ON DELETE RESTRICT
);
