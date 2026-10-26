import { Prisma } from "@prisma/client";
import { cashierNotice } from "./cashier-notice-domain";

/** Read-only check against the actual database constraint, not migration filenames. */
export function cashierNoticeStorageQuery(trigger: string) {
  if (!cashierNotice(trigger)) throw new Error("CASHIER_NOTICE_TRIGGER_INVALID");
  return Prisma.sql`SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"WhatsAppAutomation"')
      AND conname = 'WhatsAppAutomation_trigger_check' AND contype = 'c'
      AND POSITION(quote_literal(${trigger}) IN pg_get_constraintdef(oid)) > 0
  ) AS ready`;
}
