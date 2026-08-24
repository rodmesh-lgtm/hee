CREATE TABLE "BusinessStoreCatalogProduct" (
  "id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "badge" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "imageUrl" TEXT,
  "maxQuantity" INTEGER NOT NULL DEFAULT 20,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessStoreCatalogProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessStoreCatalogProduct_price_positive" CHECK ("unitPrice" > 0),
  CONSTRAINT "BusinessStoreCatalogProduct_quantity_bounds" CHECK ("maxQuantity" BETWEEN 1 AND 1000),
  CONSTRAINT "BusinessStoreCatalogProduct_sort_nonnegative" CHECK ("sortOrder" >= 0),
  CONSTRAINT "BusinessStoreCatalogProduct_sku_format" CHECK ("sku" ~ '^[a-z0-9][a-z0-9-]{2,63}$')
);

CREATE UNIQUE INDEX "BusinessStoreCatalogProduct_sku_key" ON "BusinessStoreCatalogProduct"("sku");
CREATE INDEX "BusinessStoreCatalogProduct_active_sort_idx" ON "BusinessStoreCatalogProduct"("isActive", "sortOrder", "createdAt");
CREATE INDEX "BusinessStoreCatalogProduct_category_active_idx" ON "BusinessStoreCatalogProduct"("category", "isActive", "sortOrder");

CREATE TABLE "BusinessStoreCatalogAudit" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "productId" TEXT,
  "action" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessStoreCatalogAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessStoreCatalogAudit_action_allowed" CHECK ("action" IN ('created','updated','activated','deactivated'))
);
CREATE INDEX "BusinessStoreCatalogAudit_product_created_idx" ON "BusinessStoreCatalogAudit"("productId", "createdAt");
CREATE INDEX "BusinessStoreCatalogAudit_actor_created_idx" ON "BusinessStoreCatalogAudit"("actorUserId", "createdAt");
ALTER TABLE "BusinessStoreCatalogAudit" ADD CONSTRAINT "BusinessStoreCatalogAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessStoreCatalogAudit" ADD CONSTRAINT "BusinessStoreCatalogAudit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BusinessStoreCatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "BusinessStoreCatalogProduct" ("id","sku","title","description","unitPrice","badge","category","maxQuantity","sortOrder") VALUES
('bscp-desk-nameplate','desk-nameplate','لوحة اسم مكتبية للمدير','لوحة مكتبية باسم المدير والمسمى الوظيفي وشعار المنشأة، مع QR اختياري لصفحة HEE.',12900,'مقترح الإطلاق الأول','office',20,10),
('bscp-branded-mug-qr','branded-mug-qr','كوب بهوية المنشأة + QR','كوب مخصص يحمل شعار المنشأة وألوانها ورمز QR الذي يقود مباشرة إلى صفحة الأعمال.',7900,'قابل للتخصيص','gifts',50,20),
('bscp-desk-qr-stand','desk-qr-stand','حامل QR للاستقبال والطاولات','ستاند مكتبي يفتح صفحة المنشأة أو وسائل التواصل عبر QR واضح وسهل المسح.',9900,'للعملاء والزوار','office',30,30),
('bscp-nfc-business-card','nfc-business-card','بطاقة أعمال NFC + QR','بطاقة أعمال ذكية للمدير أو الموظف تجمع NFC وQR للوصول إلى صفحة HEE ومعلومات التواصل.',14900,'هوية رقمية + مادية','identity',50,40),
('bscp-qr-stickers','qr-stickers','ملصقات QR للواجهة','ملصقات للأبواب والكاشير والمركبات تربط الزائر مباشرة بصفحة الأعمال أو واتساب.',4900,'استخدام مرن','identity',100,50),
('bscp-office-identity-bundle','office-identity-bundle','باقة هوية مكتبية','حزمة تجمع لوحة الاسم والكوب وبطاقة NFC وحامل QR بتصميم موحد لهوية المنشأة.',39900,'باقة متكاملة','bundles',10,60);
