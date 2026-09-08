CREATE OR REPLACE FUNCTION snapshot_business_note_execution_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  note_record RECORD;
BEGIN
  IF NEW."businessNoteId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "priority", "workHealth", "responsiblePerson", "businessDueAt", "nextAction"
  INTO note_record
  FROM "BusinessNote"
  WHERE "id" = NEW."businessNoteId"
    AND "businessId" = NEW."businessId"
    AND "status" <> 'archived';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'linked business note is unavailable for this tenant';
  END IF;

  NEW."priority" := note_record."priority";
  NEW."workHealth" := note_record."workHealth";
  NEW."responsiblePerson" := note_record."responsiblePerson";
  NEW."businessDueAt" := note_record."businessDueAt";
  NEW."nextAction" := note_record."nextAction";
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "SmartReminder_snapshot_business_note_execution_context" ON "SmartReminder";
CREATE TRIGGER "SmartReminder_snapshot_business_note_execution_context"
BEFORE INSERT ON "SmartReminder"
FOR EACH ROW
WHEN (NEW."businessNoteId" IS NOT NULL)
EXECUTE FUNCTION snapshot_business_note_execution_context();
