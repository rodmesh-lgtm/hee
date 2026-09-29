"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getWhatsAppWriteContext } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { writeWhatsAppAuditLog } from "../../../lib/whatsapp/audit";
import { consumePublicWriteLimit } from "../../../lib/rate-limit";
import { shortLinkDestination } from "../../../lib/short-link-domain";

const path = "/dashboard/whatsapp/links";
async function context() {
  const actor = await getWhatsAppWriteContext("campaign.manage");
  if (!actor) redirect(`${path}?result=denied`);
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: actor.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const rate = await consumePublicWriteLimit({ scope: "short-link-edit", businessId: actor.businessId, identity: actor.userId, limit: 30, windowSeconds: 60 });
  if (!rate.allowed) redirect(`${path}?result=limited`);
  return actor;
}
function fields(form: FormData) {
  const title = String(form.get("title") ?? "").trim(), destination = shortLinkDestination(String(form.get("destination") ?? ""));
  if (!title || title.length > 100 || !destination) redirect(`${path}?result=invalid`);
  return { title, destination };
}
export async function createShortLinkAction(form: FormData) {
  const actor = await context(), data = fields(form);
  await db.$transaction(async tx => {
    const link = await tx.businessShortLink.create({ data: { ...data, businessId: actor.businessId, code: randomBytes(9).toString("base64url") } });
    await writeWhatsAppAuditLog({ businessId: actor.businessId, actorUserId: actor.userId, action: "short_link.create", targetType: "short_link", targetId: link.id, outcome: "success", database: tx });
  });
  revalidatePath(path); redirect(`${path}?result=created`);
}
export async function updateShortLinkAction(form: FormData) {
  const actor = await context(), id = String(form.get("id") ?? ""), operation = String(form.get("operation") ?? "");
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id) || !["edit", "enable", "disable", "delete"].includes(operation)) redirect(`${path}?result=invalid`);
  const data = operation === "edit" ? fields(form) : { status: operation === "enable" ? "active" : operation === "disable" ? "disabled" : "deleted" };
  const result = await db.$transaction(async tx => {
    const changed = await tx.businessShortLink.updateMany({ where: { id, businessId: actor.businessId, status: { not: "deleted" } }, data });
    if (changed.count) await writeWhatsAppAuditLog({ businessId: actor.businessId, actorUserId: actor.userId, action: `short_link.${operation}`, targetType: "short_link", targetId: id, outcome: "success", database: tx });
    return changed.count;
  });
  revalidatePath(path); redirect(`${path}?result=${result ? "updated" : "unavailable"}`);
}
