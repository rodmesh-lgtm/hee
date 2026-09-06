import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "../db";

export async function isBusinessNotesSchemaReady() {
  try {
    const rows = await db.$queryRaw<Array<{ ready: boolean }>>(Prisma.sql`
      SELECT (
        to_regclass('public."BusinessNote"') IS NOT NULL
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BusinessNote' AND column_name='category')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BusinessNote' AND column_name='priority')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BusinessNote' AND column_name='tags')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='BusinessNote' AND column_name='status')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='businessNoteId')
      ) AS "ready"
    `);
    return rows[0]?.ready === true;
  } catch {
    return false;
  }
}
