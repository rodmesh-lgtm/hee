-- Preserve existing appointments; new orders may omit delivery scheduling.
ALTER TABLE "LaundryTicket" ALTER COLUMN "dueAt" DROP NOT NULL;
