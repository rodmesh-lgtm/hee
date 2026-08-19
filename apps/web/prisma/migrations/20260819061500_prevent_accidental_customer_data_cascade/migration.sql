-- Customer-data retention guardrail.
-- HEE treats an account/business record as durable once created. Normal lifecycle
-- operations must use deletedAt/unpublish/status changes, never physical parent deletion.
-- RESTRICT prevents an accidental User/Business delete from cascading through the
-- entire tenant graph. Explicit, separately authorized erasure can still delete
-- children deliberately before deleting the parent when a lawful deletion workflow exists.

ALTER TABLE "Business" DROP CONSTRAINT IF EXISTS "Business_ownerId_fkey";
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Replace every direct Business cascade with RESTRICT. This makes the database fail
-- closed if application code ever attempts a physical business deletion.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_schema = current_schema()
      AND ccu.table_name = 'Business'
      AND ccu.column_name = 'id'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      r.table_name, r.constraint_name
    );
  END LOOP;
END $$;

-- Sessions and authentication identities are intentionally not customer business data;
-- their existing lifecycle semantics are left unchanged. The durable Business relation
-- above prevents a User deletion whenever that user owns retained business data.
