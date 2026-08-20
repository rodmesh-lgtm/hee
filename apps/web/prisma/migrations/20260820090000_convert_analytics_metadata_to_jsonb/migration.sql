-- The original PostgreSQL baseline created AnalyticsEvent.metadata as TEXT while the
-- current Prisma schema and application treat it as Json. Align the physical database
-- before any JSON operators/indexes are used. Preserve malformed historical text by
-- wrapping it instead of discarding customer/audit data.

CREATE OR REPLACE FUNCTION hee_safe_text_to_jsonb(value text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN value::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('legacyText', value);
  END;
END;
$$;

DO $$
DECLARE
  metadata_type text;
BEGIN
  SELECT data_type
  INTO metadata_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'AnalyticsEvent'
    AND column_name = 'metadata';

  IF metadata_type IS NULL THEN
    RAISE EXCEPTION 'AnalyticsEvent.metadata column is missing';
  ELSIF metadata_type = 'text' OR metadata_type = 'character varying' THEN
    ALTER TABLE "AnalyticsEvent"
      ALTER COLUMN "metadata" TYPE jsonb
      USING hee_safe_text_to_jsonb("metadata");
  ELSIF metadata_type = 'json' THEN
    ALTER TABLE "AnalyticsEvent"
      ALTER COLUMN "metadata" TYPE jsonb
      USING "metadata"::jsonb;
  ELSIF metadata_type = 'jsonb' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unexpected AnalyticsEvent.metadata type: %', metadata_type;
  END IF;
END;
$$;

DROP FUNCTION hee_safe_text_to_jsonb(text);
