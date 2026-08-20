-- Tenant ownership is an invariant, not editable business data.
-- Existing application flows never move a child record between businesses. Preventing
-- businessId mutation closes a class of race/manual-SQL paths that could invalidate the
-- same-business integrity triggers after a relation was originally validated.

CREATE OR REPLACE FUNCTION prevent_tenant_business_id_change()
RETURNS trigger AS $$
BEGIN
  IF OLD."businessId" IS DISTINCT FROM NEW."businessId" THEN
    RAISE EXCEPTION 'tenant ownership is immutable for %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name text;
  trigger_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Category', 'Product', 'Customer', 'Order', 'Offer', 'Service', 'Booking',
    'WorkingHours', 'GalleryItem', 'SocialLink', 'Subscription', 'AnalyticsEvent',
    'Branch', 'Department', 'ContactPerson'
  ]
  LOOP
    trigger_name := table_name || '_immutable_business_owner';
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OF "businessId" ON %I FOR EACH ROW EXECUTE FUNCTION prevent_tenant_business_id_change()',
      trigger_name,
      table_name
    );
  END LOOP;
END;
$$;
