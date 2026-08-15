import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { extractStorageKeyFromUrl } from "../../../lib/storage";

const SAFE_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function profileReferencesStorageKey(pageModules: unknown, storageKey: string) {
  if (!Array.isArray(pageModules)) return false;
  for (const rawModule of pageModules) {
    if (!rawModule || typeof rawModule !== "object") continue;
    const module = rawModule as { id?: unknown; enabled?: unknown; config?: unknown };
    if (module.id !== "companyProfile" || module.enabled === false || !module.config || typeof module.config !== "object") continue;
    const config = module.config as { companyProfile?: unknown };
    if (!config.companyProfile || typeof config.companyProfile !== "object") continue;
    const profile = config.companyProfile as { pdfStorageKey?: unknown; pdfUrl?: unknown; visible?: unknown };
    if (profile.visible === false) continue;
    const explicitKey = typeof profile.pdfStorageKey === "string" ? profile.pdfStorageKey.trim() : "";
    const urlKey = typeof profile.pdfUrl === "string" ? extractStorageKeyFromUrl(profile.pdfUrl) : "";
    if (explicitKey === storageKey || urlKey === storageKey) return true;
  }
  return false;
}

function jsonReferencesUrl(value: unknown, url: string) {
  try { return JSON.stringify(value ?? null).includes(url); } catch { return false; }
}

async function isPublicImageReference(storageKey: string) {
  const url = `/api/storage/${storageKey}`;
  const directReference = await db.business.findFirst({
    where: {
      isPublished: true,
      deletedAt: null,
      OR: [
        { logoUrl: url },
        { coverUrl: url },
        { products: { some: { imageUrl: url, isActive: true, deletedAt: null } } },
        { services: { some: { imageUrl: url, isActive: true, deletedAt: null } } },
        { offers: { some: { imageUrl: url, isActive: true, deletedAt: null } } },
        { galleryItems: { some: { imageUrl: url, isActive: true } } },
        { contactPersons: { some: { imageUrl: url, isActive: true } } },
      ],
    },
    select: { id: true },
  });
  if (directReference) return true;

  const moduleCandidates = await db.business.findMany({
    where: { isPublished: true, deletedAt: null },
    select: { pageModules: true },
  });
  return moduleCandidates.some((business) => jsonReferencesUrl(business.pageModules, url));
}

export async function GET(_request: Request, { params }: { params: Promise<{ storageKey: string }> }) {
  const { storageKey: rawStorageKey } = await params;
  const storageKey = String(rawStorageKey ?? "").trim();
  if (!/^[0-9a-f-]{20,64}$/i.test(storageKey)) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  const stored = await db.storedObject.findUnique({
    where: { id: storageKey },
    select: { id: true, folder: true, fileName: true, mimeType: true, size: true, data: true },
  });
  if (!stored) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  if (stored.folder === "company-profiles" && stored.mimeType === "application/pdf") {
    const candidates = await db.business.findMany({ where: { isPublished: true, deletedAt: null }, select: { pageModules: true } });
    if (!candidates.some((business) => profileReferencesStorageKey(business.pageModules, stored.id))) {
      return NextResponse.json({ error: "الملف غير متاح" }, { status: 404 });
    }
    const safeName = stored.fileName.replace(/[\r\n"\\]/g, "-") || "company-profile.pdf";
    return new NextResponse(new Uint8Array(stored.data), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(stored.size),
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (!SAFE_IMAGE_MIME.has(stored.mimeType) || !(await isPublicImageReference(stored.id))) {
    return NextResponse.json({ error: "الملف غير متاح" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(stored.data), {
    status: 200,
    headers: {
      "Content-Type": stored.mimeType,
      "Content-Length": String(stored.size),
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
