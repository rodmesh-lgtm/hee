"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { consumePublicWriteLimit } from "../lib/rate-limit";
import { db } from "../lib/db";
import { fetchLiveMedia, liveGatewayConfig, readBoundedMedia } from "../lib/live-view/gateway";
import { LIVE_VIEW_COOLDOWN_MS, LIVE_VIEW_MAX_HOURS, newLiveToken, rewriteLivePlaylist } from "../lib/live-view/policy";

export type LiveViewState = { error?: string; success?: string; watchPath?: string };
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
async function actor() {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id, "liveView");
  if (!business || !user.emailVerifiedAt) return null;
  const rate = await consumePublicWriteLimit({ scope: "live-view-manage", businessId: business.id, identity: user.id, limit: 60, windowSeconds: 60 });
  return rate.allowed ? { user, business } : null;
}
async function stationLock(tx: Prisma.TransactionClient, businessId: string, id: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view:${id}`}))`;
  return tx.liveViewStation.findFirst({ where: { id, businessId } });
}
async function audit(tx: Prisma.TransactionClient, businessId: string, userId: string, action: string, id: string) {
  await tx.whatsAppAuditLog.create({ data: { businessId, actorUserId: userId, action: `live-view.${action}`, targetType: "live-view", targetId: id, outcome: "success" } });
}
export async function createLiveStationAction(_: LiveViewState, form: FormData): Promise<LiveViewState> {
  const who = await actor(); if (!who) return { error: "لا تملك صلاحية إدارة المشاهدة، أو تجاوزت عدد المحاولات. تحقق من بريد حسابك." };
  const name = text(form, "name"), location = text(form, "location"), kind = text(form, "kind");
  if (name.length < 2 || name.length > 80 || location.length < 2 || location.length > 120 || !["bay", "room", "area"].includes(kind)) return { error: "أدخل اسم المحطة وموقعها ونوعها بشكل صحيح." };
  try {
    await db.$transaction(async tx => {
      // Serialize the per-business station limit.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live-view-business:${who.business.id}`}))`;
      if (await tx.liveViewStation.count({ where: { businessId: who.business.id } }) >= 100) throw new Error("LIMIT");
      const station = await tx.liveViewStation.create({ data: { businessId: who.business.id, name, location, kind, streamKey: randomBytes(16).toString("hex") } });
      await audit(tx, who.business.id, who.user.id, "station.created", station.id);
    });
    revalidatePath("/dashboard/live-view"); return { success: "أُضيفت المحطة. اربط مسارها في بوابة البث ثم افحص الاتصال." };
  } catch { return { error: "تعذرت إضافة المحطة. الحد الحالي 100 محطة لكل منشأة." }; }
}
export async function checkLiveStationAction(_: LiveViewState, form: FormData): Promise<LiveViewState> {
  const who = await actor(); if (!who) return { error: "غير مصرح أو محاولات كثيرة." };
  const id = text(form, "stationId");
  const station = await db.liveViewStation.findFirst({ where: { id, businessId: who.business.id } });
  if (!station || !liveGatewayConfig()) return { error: "بوابة البث لم تُجهز بعد. أضف المحطات الآن واربط الكاميرات قبل إنشاء جلسة." };
  let online = false;
  try {
    const response = await fetchLiveMedia(station.streamKey, "index.m3u8");
    if (response.ok) { rewriteLivePlaylist((await readBoundedMedia(response, 256_000)).toString("utf8"), "/check"); online = true; }
    else await response.body?.cancel();
  } catch { /* Never return gateway URLs, network details or credentials. */ }
  await db.liveViewStation.updateMany({ where: { id, businessId: who.business.id }, data: { lastCheckedAt: new Date(), lastOnline: online } });
  revalidatePath("/dashboard/live-view");
  return online ? { success: "نجح فحص قائمة البث. اختبر الصورة والصوت من جلسة تجريبية قبل مشاركة الرابط." } : { error: "لم يصل بث صالح من الكاميرا. تحقق من إعداد البوابة والاتصال." };
}
export async function createLiveSessionAction(_: LiveViewState, form: FormData): Promise<LiveViewState> {
  const who = await actor(); if (!who) return { error: "غير مصرح أو محاولات كثيرة." };
  if (!liveGatewayConfig()) return { error: "إنشاء روابط المشاهدة متوقف حتى تكتمل تهيئة بوابة البث." };
  const id = text(form, "stationId"), customerName = text(form, "customerName"), reference = text(form, "reference");
  const hours = Number(text(form, "hours"));
  if (customerName.length < 2 || customerName.length > 80 || !reference || reference.length > 100 || !Number.isInteger(hours) || hours < 1 || hours > LIVE_VIEW_MAX_HOURS || form.get("privacyConfirmed") !== "on") return { error: "أكمل بيانات العميل والمرجع والمدة، وأكد تخصيص المحطة للعميل." };
  const { token, hash } = newLiveToken();
  try {
    await db.$transaction(async tx => {
      const station = await stationLock(tx, who.business.id, id); const now = new Date();
      if (!station?.enabled || !station.lastOnline || !station.lastCheckedAt || now.getTime() - station.lastCheckedAt.getTime() > 15 * 60_000) throw new Error("CHECK_CAMERA");
      if (station.reuseAfterAt && station.reuseAfterAt > now) throw new Error("COOLDOWN");
      const open = await tx.liveViewSession.findFirst({ where: { stationId: id, businessId: who.business.id, endedAt: null } });
      if (open && open.expiresAt > now) throw new Error("BUSY");
      if (open) {
        // Keep the buffer-drain interval after the actual lease expiry.
        if (now.getTime() - open.expiresAt.getTime() < LIVE_VIEW_COOLDOWN_MS) throw new Error("COOLDOWN");
        await tx.liveViewSession.update({ where: { id: open.id }, data: { endedAt: open.expiresAt } });
      }
      const created = await tx.liveViewSession.create({ data: { businessId: who.business.id, stationId: id, customerName, reference, tokenHash: hash, createdAt: now, expiresAt: new Date(now.getTime() + hours * 3600_000) } });
      await audit(tx, who.business.id, who.user.id, "session.created", created.id);
    });
    revalidatePath("/dashboard/live-view");
    // Only this response contains the bearer link. It is never persisted or logged.
    return { success: "أُنشئت الجلسة. انسخ الرابط الآن؛ لن يُعرض مجددًا بعد مغادرة الصفحة.", watchPath: `/watch/${token}` };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return { error: code === "BUSY" ? "المحطة مرتبطة بجلسة أخرى. أنهِها أولًا." : code === "COOLDOWN" ? "انتظر 30 ثانية بعد انتهاء الجلسة السابقة قبل إعادة استخدام المحطة." : code === "CHECK_CAMERA" ? "فعّل المحطة وأعد فحص اتصال الكاميرا؛ صلاحية الفحص 15 دقيقة." : "تعذر إنشاء الجلسة. حدّث الصفحة وحاول مجددًا." };
  }
}
export async function endLiveSessionAction(_: LiveViewState, form: FormData): Promise<LiveViewState> {
  const who = await actor(); if (!who) return { error: "غير مصرح أو محاولات كثيرة." };
  try {
    await db.$transaction(async tx => {
      const session = await tx.liveViewSession.findFirst({ where: { id: text(form, "sessionId"), businessId: who.business.id } });
      if (!session) throw new Error("NOT_FOUND");
      await stationLock(tx, who.business.id, session.stationId);
      const now = new Date();
      const changed = await tx.liveViewSession.updateMany({ where: { id: session.id, businessId: who.business.id, endedAt: null }, data: { endedAt: now } });
      if (changed.count) {
        await tx.liveViewStation.update({ where: { id: session.stationId }, data: { reuseAfterAt: new Date(now.getTime() + LIVE_VIEW_COOLDOWN_MS) } });
        await audit(tx, who.business.id, who.user.id, "session.ended", session.id);
      }
    });
    revalidatePath("/dashboard/live-view"); return { success: "أُبطل الرابط ومُنعت طلبات الفيديو الجديدة. انتظر 30 ثانية قبل تخصيص المحطة لعميل آخر." };
  } catch { return { error: "تعذر إنهاء الجلسة. أعد المحاولة قبل تخصيص المحطة لعميل آخر." }; }
}
export async function toggleLiveStationAction(_: LiveViewState, form: FormData): Promise<LiveViewState> {
  const who = await actor(); if (!who) return { error: "غير مصرح أو محاولات كثيرة." };
  try {
    await db.$transaction(async tx => {
      const station = await stationLock(tx, who.business.id, text(form, "stationId"));
      if (!station) throw new Error("NOT_FOUND");
      const now = new Date();
      await tx.liveViewStation.update({ where: { id: station.id }, data: { enabled: !station.enabled, lastOnline: false, reuseAfterAt: new Date(now.getTime() + LIVE_VIEW_COOLDOWN_MS) } });
      // Disabling permanently closes leases; enabling cannot revive old links.
      await tx.liveViewSession.updateMany({ where: { stationId: station.id, businessId: who.business.id, endedAt: null }, data: { endedAt: now } });
      await audit(tx, who.business.id, who.user.id, station.enabled ? "station.disabled" : "station.enabled", station.id);
    });
    revalidatePath("/dashboard/live-view"); return { success: "تم تحديث المحطة. يلزم فحص الاتصال قبل إنشاء جلسة جديدة." };
  } catch { return { error: "تعذر تحديث المحطة." }; }
}
