import { Prisma } from "@prisma/client";
import { db } from "../../../../lib/db";
import { readPersistentObject } from "../../../../lib/storage";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9-]{16,128}$/.test(id)) return new Response(null, { status: 404 });
  const asset = await db.storedObject.findFirst({ where: { id, folder: { startsWith: "campaign-media/" } }, select: { folder: true, mimeType: true } });
  if (!asset || !["image/jpeg", "image/png", "video/mp4", "application/pdf"].includes(asset.mimeType)) return new Response(null, { status: 404 });
  const businessId = asset.folder.slice("campaign-media/".length);
  const url = `https://ir.sa/api/whatsapp/campaign-media/${id}`;
  const references = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT c."id" FROM "WhatsAppCampaign" c
    WHERE c."businessId" = ${businessId} AND c."snapshotAt" IS NOT NULL
      AND c."templateSnapshot"->>'mediaUrl' = ${url} LIMIT 1
  `);
  if (!references.length) {
    const context = await getWhatsAppReadContext("campaign.manage");
    if (context?.businessId !== businessId) return new Response(null, { status: 404 });
  }
  const file = await readPersistentObject(id);
  if (!file) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file.data), { headers: { "Content-Type": file.mimeType, "Content-Length": String(file.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": `inline; filename="campaign-media.${file.mimeType === "application/pdf" ? "pdf" : file.mimeType === "video/mp4" ? "mp4" : file.mimeType === "image/png" ? "png" : "jpg"}"` } });
}
