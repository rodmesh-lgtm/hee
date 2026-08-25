"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { requireAdmin } from "../lib/admin";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { consumePublicWriteLimit } from "../lib/rate-limit";

const SUPPORT_EVENT = "support_requested";
const categories = new Set(["account", "billing", "technical", "privacy", "other"]);
const privacyResolutionOutcomes = new Set(["deletion_completed", "retention_exception"]);

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(formData: FormData, name: string, max: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value && value.length <= max ? value : null;
}

export async function createSupportRequestAction(formData: FormData) {
  const user = await getCurrentUserForWrites();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const category = String(formData.get("category") ?? "other").trim().toLowerCase();
  const subject = text(formData, "subject", 120);
  const message = text(formData, "message", 4000);
  if (!categories.has(category) || !subject || !message) redirect("/dashboard/support?error=invalid");

  let rate;
  try {
    rate = await consumePublicWriteLimit({
      scope: "customer-support",
      businessId: business.id,
      identity: user.id,
      limit: 8,
      windowSeconds: 24 * 60 * 60,
    });
  } catch (error) {
    console.error("[support] rate_limit_failed", { businessId: business.id, error });
    redirect("/dashboard/support?error=unavailable");
  }
  if (!rate.allowed) redirect("/dashboard/support?error=rate-limited");

  await db.analyticsEvent.create({
    data: {
      businessId: business.id,
      eventType: SUPPORT_EVENT,
      metadata: {
        status: "open",
        category,
        subject,
        message,
        requestedByUserId: user.id,
        requestedByEmail: user.email,
      },
    },
  });

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  redirect("/dashboard/support?sent=1");
}

export async function resolveSupportRequestAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const resolutionNote = text(formData, "resolutionNote", 2000);
  const privacyOutcome = String(formData.get("privacyOutcome") ?? "").trim().toLowerCase();
  if (!eventId || !resolutionNote) redirect("/admin/support?error=resolution-note-required");

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`support:${eventId}`}))`;
    const event = await tx.analyticsEvent.findUnique({ where: { id: eventId }, select: { id: true, eventType: true, metadata: true } });
    if (!event || event.eventType !== SUPPORT_EVENT) return "invalid" as const;
    const metadata = metadataObject(event.metadata);
    if (metadata.status !== "open") return "already" as const;

    // Privacy/data-erasure tickets must never be closed by a generic free-text note.
    // Until the full verified deletion lifecycle exists, require an explicit auditable
    // outcome: either deletion/anonymization has actually completed, or a lawful
    // retention exception is being recorded. This keeps the workflow fail-closed.
    if (metadata.category === "privacy" && !privacyResolutionOutcomes.has(privacyOutcome)) {
      return "privacy-outcome-required" as const;
    }

    await tx.analyticsEvent.update({
      where: { id: event.id },
      data: {
        metadata: {
          ...metadata,
          status: "resolved",
          resolutionNote,
          ...(metadata.category === "privacy" ? { privacyOutcome } : {}),
          resolvedAt: new Date().toISOString(),
          resolvedByUserId: admin.id,
          resolvedByEmail: admin.email,
        },
      },
    });
    return "resolved" as const;
  });

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  if (result === "invalid") redirect("/admin/support?error=invalid");
  if (result === "privacy-outcome-required") redirect("/admin/support?error=privacy-outcome-required");
  redirect(`/admin/support?done=${result}`);
}
