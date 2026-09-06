"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { isBusinessNotesSchemaReady } from "../lib/business-notes/schema-readiness";

const text = (form: FormData, key: string, max: number) => {
  const value = String(form.get(key) ?? "").trim();
  return value && value.length <= max ? value : null;
};

async function context() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/dashboard?business=required");
  if (!await isBusinessNotesSchemaReady()) redirect("/dashboard/notes?schema=pending");
  return { userId: user.id, businessId: business.id };
}

function done(action: string) {
  revalidatePath("/dashboard/notes");
  redirect(`/dashboard/notes?${action}=success`);
}

export async function createBusinessNoteAction(form: FormData) {
  const { businessId } = await context();
  const title = text(form, "title", 160);
  const body = text(form, "body", 8000);
  if (!title || !body) redirect("/dashboard/notes?create=invalid");
  const isPinned = form.get("isPinned") === "on";
  await db.$executeRaw(Prisma.sql`
    INSERT INTO "BusinessNote" ("id", "businessId", "title", "body", "isPinned", "sortOrder", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${businessId}, ${title}, ${body}, ${isPinned}, 0, NOW(), NOW())
  `);
  done("create");
}

export async function updateBusinessNoteAction(form: FormData) {
  const { businessId } = await context();
  const noteId = text(form, "noteId", 128);
  const title = text(form, "title", 160);
  const body = text(form, "body", 8000);
  if (!noteId || !title || !body) redirect("/dashboard/notes?update=invalid");
  const changed = await db.$executeRaw(Prisma.sql`
    UPDATE "BusinessNote" SET "title"=${title}, "body"=${body}, "updatedAt"=NOW()
    WHERE "id"=${noteId} AND "businessId"=${businessId}
  `);
  if (changed !== 1) redirect("/dashboard/notes?update=missing");
  done("update");
}

export async function deleteBusinessNoteAction(form: FormData) {
  const { businessId } = await context();
  const noteId = text(form, "noteId", 128);
  if (!noteId) redirect("/dashboard/notes?delete=invalid");
  const changed = await db.$executeRaw(Prisma.sql`DELETE FROM "BusinessNote" WHERE "id"=${noteId} AND "businessId"=${businessId}`);
  if (changed !== 1) redirect("/dashboard/notes?delete=missing");
  done("delete");
}

export async function toggleBusinessNotePinAction(form: FormData) {
  const { businessId } = await context();
  const noteId = text(form, "noteId", 128);
  if (!noteId) redirect("/dashboard/notes?pin=invalid");
  const changed = await db.$executeRaw(Prisma.sql`
    UPDATE "BusinessNote" SET "isPinned"=NOT "isPinned", "updatedAt"=NOW()
    WHERE "id"=${noteId} AND "businessId"=${businessId}
  `);
  if (changed !== 1) redirect("/dashboard/notes?pin=missing");
  done("pin");
}

export async function moveBusinessNoteAction(form: FormData) {
  const { businessId } = await context();
  const noteId = text(form, "noteId", 128);
  const direction = text(form, "direction", 8);
  if (!noteId || !["up", "down"].includes(direction ?? "")) redirect("/dashboard/notes?move=invalid");
  const delta = direction === "up" ? -1 : 1;
  const changed = await db.$executeRaw(Prisma.sql`
    UPDATE "BusinessNote"
    SET "sortOrder"=GREATEST(-100000, LEAST(100000, "sortOrder" + ${delta})), "updatedAt"=NOW()
    WHERE "id"=${noteId} AND "businessId"=${businessId}
  `);
  if (changed !== 1) redirect("/dashboard/notes?move=missing");
  done("move");
}
