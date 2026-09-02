CREATE TABLE "PlatformDesignSetting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "draft" JSONB NOT NULL,
  "published" JSONB NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "PlatformDesignSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PlatformDesignSetting_updatedByUserId_idx" ON "PlatformDesignSetting"("updatedByUserId");

CREATE TABLE "PlatformDesignAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "settingKey" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformDesignAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PlatformDesignAudit_settingKey_createdAt_idx" ON "PlatformDesignAudit"("settingKey", "createdAt");
CREATE INDEX "PlatformDesignAudit_actorUserId_createdAt_idx" ON "PlatformDesignAudit"("actorUserId", "createdAt");
