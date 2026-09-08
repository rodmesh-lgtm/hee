import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";

export const REMINDER_PROGRESS_PRESETS = [0, 25, 50, 75, 100] as const;

export function normalizeReminderProgress(value: unknown) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) throw new Error("REMINDER_PROGRESS_INVALID");
  return numeric;
}

export function reminderProgressLabel(progressPercent: number) {
  if (progressPercent >= 100) return "منجز بالكامل";
  if (progressPercent === 50) return "منجز نصفه";
  if (progressPercent > 50) return "أكثر من النصف";
  if (progressPercent > 0) return "منجز جزئيًا";
  return "لم يبدأ";
}

function normalizeProgressNote(value: string | null | undefined) {
  const note = String(value ?? "").normalize("NFKC").trim();
  if (note.length > 1000) throw new Error("REMINDER_PROGRESS_NOTE_INVALID");
  return note || null;
}

export async function updateReminderWorkProgress(input: {
  businessId: string;
  actorUserId: string;
  reminderId: string;
  progressPercent: number;
  progressNote?: string | null;
}) {
  const progressPercent = normalizeReminderProgress(input.progressPercent);
  const progressNote = normalizeProgressNote(input.progressNote);

  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string; progressPercent: number }>>(Prisma.sql`
      SELECT "id", "status", "progressPercent"
      FROM "SmartReminder"
      WHERE "id"=${input.reminderId} AND "businessId"=${input.businessId}
      FOR UPDATE
    `);
    const reminder = rows[0];
    if (!reminder || reminder.status === "cancelled") throw new Error("REMINDER_PROGRESS_NOT_EDITABLE");

    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder"
      SET "progressPercent"=${progressPercent},
          "progressNote"=${progressNote},
          "progressUpdatedAt"=CURRENT_TIMESTAMP,
          "workCompletedAt"=${progressPercent === 100 ? new Date() : null},
          "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${input.reminderId} AND "businessId"=${input.businessId}
    `);

    await writeWhatsAppAuditLog({
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      action: "reminder.progress.update",
      targetType: "smart_reminder",
      targetId: input.reminderId,
      outcome: "success",
      metadata: {
        previousProgressPercent: reminder.progressPercent,
        progressPercent,
        hasProgressNote: Boolean(progressNote),
      },
      database: tx,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { progressPercent, progressLabel: reminderProgressLabel(progressPercent) };
}
