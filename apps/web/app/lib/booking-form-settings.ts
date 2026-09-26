import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { BOOKING_FORM_KEY, DEFAULT_BOOKING_CATALOG, parseBookingCatalog } from "./booking-form-domain";

export async function readBookingForms() {
  const rows = await db.$queryRaw<Array<{ draft: unknown; published: unknown }>>(Prisma.sql`SELECT "draft", "published" FROM "PlatformDesignSetting" WHERE "key"=${BOOKING_FORM_KEY} LIMIT 1`);
  const row = rows[0];
  return { draft: row ? parseBookingCatalog(row.draft) : DEFAULT_BOOKING_CATALOG, published: row ? parseBookingCatalog(row.published) : DEFAULT_BOOKING_CATALOG };
}
export async function readPublishedBookingForm() {
  const { published } = await readBookingForms();
  return published.forms.find(form => form.id === published.activeId)!;
}
