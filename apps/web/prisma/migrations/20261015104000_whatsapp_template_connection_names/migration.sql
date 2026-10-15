-- Template names are scoped to a linked Meta account, not to the entire tenant.
-- Preserve old template identities, approval states and historical references.
BEGIN;
CREATE UNIQUE INDEX "WhatsAppTemplate_business_connection_name_language_unique"
ON "WhatsAppTemplate"("businessId", "connectionId", "name", "language");
DROP INDEX "WhatsAppTemplate_business_name_language_unique";
COMMIT;
