import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "../../db";

export async function isBusinessNotesSchemaReady() {
  try {
    const rows = await db.$queryRaw<Array<{ ready: boolean }>>(Prisma.sql`
      SELECT to_regclass('public."BusinessNote"') IS NOT NULL AS "ready"
    `);
    return rows[0]?.ready === true;
  } catch {
    return false;
  }
}
