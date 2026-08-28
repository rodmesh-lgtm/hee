"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnedBusinessForWrite } from "../lib/ownership";
import { enqueueWhatsAppReply } from "../lib/whatsapp/reply-queue";
const text = (data: FormData, key: string, max: number) => { const value = String(data.get(key) ?? "").trim(); return value.length > 0 && value.length <= max ? value : null; };
export async function enqueueWhatsAppReplyAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite(); if (!business) redirect("/login");
  const conversationId = text(formData, "conversationId", 128), requestId = text(formData, "requestId", 36), message = text(formData, "message", 4096);
  if (!conversationId || !requestId || !message) redirect("/dashboard/whatsapp/inbox?reply=invalid");
  let outcome = "queued";
  try { await enqueueWhatsAppReply({ businessId: business.id, conversationId, requestId, textBody: message }); }
  catch (error) { const code = error instanceof Error ? error.message : ""; outcome = code === "WHATSAPP_REPLY_WINDOW_CLOSED" ? "window-closed" : code === "WHATSAPP_REPLY_QUEUE_FULL" ? "queue-full" : "unavailable"; }
  revalidatePath("/dashboard/whatsapp/inbox");
  redirect(`/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(conversationId)}&reply=${outcome}`);
}
