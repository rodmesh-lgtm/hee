"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { planHasWhatsAppMarketing } from "../lib/whatsapp/feature-entitlement";
import { completeEmbeddedSignup, createEmbeddedSignupSession } from "../lib/whatsapp/embedded-signup";
import { enqueueWhatsAppReply } from "../lib/whatsapp/reply-queue";
const text = (data: FormData, key: string, max: number) => { const value = String(data.get(key) ?? "").trim(); return value.length > 0 && value.length <= max ? value : null; };
export async function enqueueWhatsAppReplyAction(formData: FormData) {
  const business = await getOwnedBusinessWithPlanForWrite(); if (!business) redirect("/login");
  if (!planHasWhatsAppMarketing(business.plan?.code)) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const conversationId = text(formData, "conversationId", 128), requestId = text(formData, "requestId", 36), message = text(formData, "message", 4096);
  if (!conversationId || !requestId || !message) redirect("/dashboard/whatsapp/inbox?reply=invalid");
  let outcome = "queued";
  try { await enqueueWhatsAppReply({ businessId: business.id, conversationId, requestId, textBody: message }); }
  catch (error) { const code = error instanceof Error ? error.message : ""; outcome = code === "WHATSAPP_REPLY_WINDOW_CLOSED" ? "window-closed" : code === "WHATSAPP_REPLY_QUEUE_FULL" ? "queue-full" : "unavailable"; }
  revalidatePath("/dashboard/whatsapp/inbox");
  redirect(`/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(conversationId)}&reply=${outcome}`);
}

export async function startWhatsAppEmbeddedSignupAction() {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) return { ok: false as const, error: "unauthorized" };
  if (!planHasWhatsAppMarketing(business.plan?.code)) return { ok: false as const, error: "entitlement-required" };
  try {
    const session = await createEmbeddedSignupSession({ businessId: business.id, userId: business.ownerId });
    return { ok: true as const, state: session.state, expiresAt: session.expiresAt.toISOString() };
  } catch {
    return { ok: false as const, error: "unavailable" };
  }
}

export async function completeWhatsAppEmbeddedSignupAction(input: { state: string; authorizationCode: string; wabaId: string; phoneNumberId: string }) {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) return { ok: false as const, error: "unauthorized" };
  if (!planHasWhatsAppMarketing(business.plan?.code)) return { ok: false as const, error: "entitlement-required" };
  try {
    await completeEmbeddedSignup({ businessId: business.id, userId: business.ownerId, ...input });
    revalidatePath("/dashboard/whatsapp/setup");
    return { ok: true as const };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const safe = code === "WHATSAPP_ASSET_ALREADY_ASSIGNED" ? "asset-assigned" : code === "WHATSAPP_SIGNUP_SESSION_INVALID" ? "session-expired" : code === "META_PHONE_NOT_OWNED_BY_WABA" ? "asset-invalid" : "unavailable";
    return { ok: false as const, error: safe };
  }
}
