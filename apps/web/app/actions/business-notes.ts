"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { isBusinessNotesSchemaReady } from "../lib/business-notes/schema-readiness";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";

const text = (form: FormData, key: string, max: number) => {
  const value = String(form.get(key) ?? "").normalize("NFKC").trim();
  return value && value.length <= max ? value : null;
};

const enumValue = <T extends string>(form: FormData, key: string, allowed: readonly T[], fallback: T) => {
  const value = String(form.get(key) ?? fallback) as T;
  return allowed.includes(value) ? value : fallback;
};

const tags = (form: FormData) => [...new Set(String(form.get("tags") ?? "").split(/[،,]/).map((tag) => tag.normalize("NFKC").trim()).filter(Boolean))].slice(0, 12).map((tag) => tag.slice(0, 40));

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
  revalidatePath("/dashboard/reminders");
  redirect(`/dashboard/notes?${action}=success`);
}

async function audit(tx: Prisma.TransactionClient, input: { businessId: string; userId: string; action: string; noteId: string; metadata?: Record<string, string | number | boolean | null> }) {
  await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.userId, action: input.action, targetType: "business_note", targetId: input.noteId, outcome: "success", metadata: input.metadata, database: tx });
}

export async function createBusinessNoteAction(form: FormData) {
  const { businessId, userId } = await context();
  const title = text(form, "title", 160);
  const body = text(form, "body", 8000);
  if (!title || !body) redirect("/dashboard/notes?create=invalid");
  const isPinned = form.get("isPinned") === "on";
  const category = text(form, "category", 64) ?? "عام";
  const priority = enumValue(form, "priority", ["low", "normal", "high", "urgent"] as const, "normal");
  const status = enumValue(form, "status", ["draft", "active"] as const, "active");
  const noteTags = tags(form);
  const noteId = randomUUID();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "BusinessNote" ("id", "businessId", "title", "body", "isPinned", "sortOrder", "category", "priority", "tags", "status", "createdAt", "updatedAt")
      VALUES (${noteId}, ${businessId}, ${title}, ${body}, ${isPinned}, 0, ${category}, ${priority}, ${noteTags}, ${status}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    await audit(tx, { businessId, userId, action: "business_note.create", noteId, metadata: { priority, status, pinned: isPinned, tagCount: noteTags.length } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  done("create");
}

export async function updateBusinessNoteAction(form: FormData) {
  const { businessId, userId } = await context();
  const noteId = text(form, "noteId", 128);
  const title = text(form, "title", 160);
  const body = text(form, "body", 8000);
  if (!noteId || !title || !body) redirect("/dashboard/notes?update=invalid");
  const category = text(form, "category", 64) ?? "عام";
  const priority = enumValue(form, "priority", ["low", "normal", "high", "urgent"] as const, "normal");
  const status = enumValue(form, "status", ["draft", "active"] as const, "active");
  const noteTags = tags(form);
  const changed = await db.$transaction(async (tx) => {
    const count = await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessNote" SET "title"=${title}, "body"=${body}, "category"=${category}, "priority"=${priority}, "tags"=${noteTags}, "status"=${status}, "archivedAt"=NULL, "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status" <> 'archived'
    `);
    if (count === 1) await audit(tx, { businessId, userId, action: "business_note.update", noteId, metadata: { priority, status, tagCount: noteTags.length } });
    return count;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (changed !== 1) redirect("/dashboard/notes?update=missing");
  done("update");
}

export async function archiveBusinessNoteAction(form: FormData) {
  const { businessId, userId } = await context();
  const noteId = text(form, "noteId", 128);
  if (!noteId) redirect("/dashboard/notes?archive=invalid");
  const changed = await db.$transaction(async (tx) => {
    const count = await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessNote" SET "status"='archived', "archivedAt"=CURRENT_TIMESTAMP, "isPinned"=false, "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status" <> 'archived'
    `);
    if (count === 1) await audit(tx, { businessId, userId, action: "business_note.archive", noteId });
    return count;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (changed !== 1) redirect("/dashboard/notes?archive=missing");
  done("archive");
}

export async function restoreBusinessNoteAction(form: FormData) {
  const { businessId, userId } = await context();
  const noteId = text(form, "noteId", 128);
  if (!noteId) redirect("/dashboard/notes?restore=invalid");
  const changed = await db.$transaction(async (tx) => {
    const count = await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessNote" SET "status"='active', "archivedAt"=NULL, "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status"='archived'
    `);
    if (count === 1) await audit(tx, { businessId, userId, action: "business_note.restore", noteId });
    return count;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (changed !== 1) redirect("/dashboard/notes?restore=missing");
  done("restore");
}

export async function deleteBusinessNoteAction(form: FormData) {
  const { businessId, userId } = await context();
  const noteId = text(form, "noteId", 128);
  if (!noteId) redirect("/dashboard/notes?delete=invalid");
  const outcome = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "BusinessNote" WHERE "id"=${noteId} AND "businessId"=${businessId} FOR UPDATE`);
    if (!rows[0]) return "missing" as const;
    const linked = await tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS "count" FROM "SmartReminder" WHERE "businessId"=${businessId} AND "businessNoteId"=${noteId}`);
    if (Number(linked[0]?.count ?? 0) > 0) return "linked" as const;
    const count = await tx.$executeRaw(Prisma.sql`DELETE FROM "BusinessNote" WHERE "id"=${noteId} AND "businessId"=${businessId}`);
    if (count !== 1) return "missing" as const;
    await audit(tx, { businessId, userId, action: "business_note.delete", noteId });
    return "deleted" as const;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (outcome === "linked") redirect("/dashboard/notes?delete=linked-reminder");
  if (outcome !== "deleted") redirect("/dashboard/notes?delete=missing");
  done("delete");
}

export async function toggleBusinessNotePinAction(form: FormData) {
  const { businessId, userId } = await context();
  const noteId = text(form, "noteId", 128);
  if (!noteId) redirect("/dashboard/notes?pin=invalid");
  const changed = await db.$transaction(async (tx) => {
    const count = await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessNote" SET "isPinned"=NOT "isPinned", "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status" <> 'archived'
    `);
    if (count === 1) await audit(tx, { businessId, userId, action: "business_note.pin_toggle", noteId });
    return count;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (changed !== 1) redirect("/dashboard/notes?pin=missing");
  done("pin");
}

export async function moveBusinessNoteAction(form: FormData) {
  const { businessId, userId } = await context();
  const noteId = text(form, "noteId", 128);
  const direction = text(form, "direction", 8);
  if (!noteId || !["up", "down"].includes(direction ?? "")) redirect("/dashboard/notes?move=invalid");
  const delta = direction === "up" ? -1 : 1;
  const changed = await db.$transaction(async (tx) => {
    const count = await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessNote" SET "sortOrder"=GREATEST(-100000, LEAST(100000, "sortOrder" + ${delta})), "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status" <> 'archived'
    `);
    if (count === 1) await audit(tx, { businessId, userId, action: "business_note.reorder", noteId, metadata: { direction: direction! } });
    return count;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (changed !== 1) redirect("/dashboard/notes?move=missing");
  done("move");
}