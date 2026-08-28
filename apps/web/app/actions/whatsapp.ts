"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";
import { completeEmbeddedSignup, createEmbeddedSignupSession } from "../lib/whatsapp/embedded-signup";
import { enqueueWhatsAppReply } from "../lib/whatsapp/reply-queue";
const text = (data: FormData, key: string, max: number) => { const value = String(data.get(key) ?? "").trim(); return value.length > 0 && value.length <= max ? value : null; };
export async function enqueueWhatsAppReplyAction(formData: FormData) {
  const context = await getWhatsAppWriteContext("reply"); if (!context) redirect("/dashboard/whatsapp/inbox?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const conversationId = text(formData, "conversationId", 128), requestId = text(formData, "requestId", 36), message = text(formData, "message", 4096);
  if (!conversationId || !requestId || !message) redirect("/dashboard/whatsapp/inbox?reply=invalid");
  let outcome = "queued";
  try { await enqueueWhatsAppReply({ businessId: context.businessId, actorUserId: context.userId, conversationId, requestId, textBody: message }); }
  catch (error) { const code = error instanceof Error ? error.message : ""; outcome = code === "WHATSAPP_REPLY_WINDOW_CLOSED" ? "window-closed" : code === "WHATSAPP_REPLY_QUEUE_FULL" ? "queue-full" : "unavailable"; }
  revalidatePath("/dashboard/whatsapp/inbox");
  redirect(`/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(conversationId)}&reply=${outcome}`);
}

export async function startWhatsAppEmbeddedSignupAction() {
  const context = await getWhatsAppWriteContext("connection.manage");
  if (!context) return { ok: false as const, error: "forbidden" };
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return { ok: false as const, error: "entitlement-required" };
  try {
    const session = await createEmbeddedSignupSession({ businessId: context.businessId, userId: context.userId });
    return { ok: true as const, state: session.state, expiresAt: session.expiresAt.toISOString() };
  } catch {
    return { ok: false as const, error: "unavailable" };
  }
}

export async function completeWhatsAppEmbeddedSignupAction(input: { state: string; authorizationCode: string; wabaId: string; phoneNumberId: string }) {
  const context = await getWhatsAppWriteContext("connection.manage");
  if (!context) return { ok: false as const, error: "forbidden" };
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) return { ok: false as const, error: "entitlement-required" };
  try {
    await completeEmbeddedSignup({ businessId: context.businessId, userId: context.userId, ...input });
    revalidatePath("/dashboard/whatsapp/setup");
    return { ok: true as const };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    await writeWhatsAppAuditLog({ businessId: context.businessId, actorUserId: context.userId, action: "connection.signup.complete", targetType: "connection", outcome: "failed", metadata: { reason: code || "unknown" } }).catch(() => undefined);
    const safe = code === "WHATSAPP_ASSET_ALREADY_ASSIGNED" ? "asset-assigned" : code === "WHATSAPP_SIGNUP_SESSION_INVALID" ? "session-expired" : code === "META_PHONE_NOT_OWNED_BY_WABA" ? "asset-invalid" : "unavailable";
    return { ok: false as const, error: safe };
  }
}
