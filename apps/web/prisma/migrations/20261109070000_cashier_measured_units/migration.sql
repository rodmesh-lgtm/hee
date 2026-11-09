ALTER TABLE "LaundryService" ADD COLUMN unit TEXT NOT NULL DEFAULT 'piece' CHECK (unit IN ('piece','meter','square_meter'));
