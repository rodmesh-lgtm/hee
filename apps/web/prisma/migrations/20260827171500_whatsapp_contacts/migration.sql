CREATE TABLE "WhatsAppContact" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "phoneE164" TEXT NOT NULL,
  "displayName" TEXT,
  "email" TEXT,
  "source" TEXT NOT NULL,
  "attributes" JSONB,
  "optedOutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppContact_business_phone_unique" ON "WhatsAppContact"("businessId", "phoneE164");
CREATE UNIQUE INDEX "WhatsAppContact_id_business_unique" ON "WhatsAppContact"("id", "businessId");
CREATE INDEX "WhatsAppContact_business_optout_idx" ON "WhatsAppContact"("businessId", "optedOutAt");
CREATE INDEX "WhatsAppContact_business_created_idx" ON "WhatsAppContact"("businessId", "createdAt");
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_phone_e164_check" CHECK ("phoneE164" ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_source_check" CHECK ("source" IN ('manual', 'csv', 'excel', 'api', 'inbound', 'integration'));

CREATE TABLE "WhatsAppContactTag" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppContactTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppContactTag_business_name_unique" ON "WhatsAppContactTag"("businessId", "normalizedName");
CREATE UNIQUE INDEX "WhatsAppContactTag_id_business_unique" ON "WhatsAppContactTag"("id", "businessId");
CREATE INDEX "WhatsAppContactTag_business_created_idx" ON "WhatsAppContactTag"("businessId", "createdAt");
ALTER TABLE "WhatsAppContactTag" ADD CONSTRAINT "WhatsAppContactTag_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppContactTag" ADD CONSTRAINT "WhatsAppContactTag_name_check" CHECK (length(btrim("normalizedName")) BETWEEN 1 AND 80);

CREATE TABLE "WhatsAppContactTagMembership" (
  "businessId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppContactTagMembership_pkey" PRIMARY KEY ("contactId", "tagId")
);

CREATE INDEX "WhatsAppContactTagMembership_business_tag_idx" ON "WhatsAppContactTagMembership"("businessId", "tagId");
ALTER TABLE "WhatsAppContactTagMembership" ADD CONSTRAINT "WhatsAppContactTagMembership_contact_tenant_fkey" FOREIGN KEY ("contactId", "businessId") REFERENCES "WhatsAppContact"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppContactTagMembership" ADD CONSTRAINT "WhatsAppContactTagMembership_tag_tenant_fkey" FOREIGN KEY ("tagId", "businessId") REFERENCES "WhatsAppContactTag"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WhatsAppSegment" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'static',
  "definition" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppSegment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppSegment_business_name_unique" ON "WhatsAppSegment"("businessId", "normalizedName");
CREATE UNIQUE INDEX "WhatsAppSegment_id_business_unique" ON "WhatsAppSegment"("id", "businessId");
CREATE INDEX "WhatsAppSegment_business_kind_idx" ON "WhatsAppSegment"("businessId", "kind");
ALTER TABLE "WhatsAppSegment" ADD CONSTRAINT "WhatsAppSegment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppSegment" ADD CONSTRAINT "WhatsAppSegment_kind_check" CHECK ("kind" IN ('static', 'dynamic'));
ALTER TABLE "WhatsAppSegment" ADD CONSTRAINT "WhatsAppSegment_name_check" CHECK (length(btrim("normalizedName")) BETWEEN 1 AND 80);
ALTER TABLE "WhatsAppSegment" ADD CONSTRAINT "WhatsAppSegment_definition_check" CHECK (("kind" = 'static' AND "definition" IS NULL) OR ("kind" = 'dynamic' AND "definition" IS NOT NULL));

CREATE TABLE "WhatsAppSegmentMembership" (
  "businessId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "segmentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppSegmentMembership_pkey" PRIMARY KEY ("contactId", "segmentId")
);

CREATE INDEX "WhatsAppSegmentMembership_business_segment_idx" ON "WhatsAppSegmentMembership"("businessId", "segmentId");
ALTER TABLE "WhatsAppSegmentMembership" ADD CONSTRAINT "WhatsAppSegmentMembership_contact_tenant_fkey" FOREIGN KEY ("contactId", "businessId") REFERENCES "WhatsAppContact"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppSegmentMembership" ADD CONSTRAINT "WhatsAppSegmentMembership_segment_tenant_fkey" FOREIGN KEY ("segmentId", "businessId") REFERENCES "WhatsAppSegment"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
