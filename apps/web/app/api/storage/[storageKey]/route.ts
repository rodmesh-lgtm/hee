import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { ensurePersistentStorageReady, readPersistentObject } from "../../../lib/storage";

const SAFE_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUTHORIZED_FILE_CACHE_CONTROL = "private, no-store, max-age=0";
const PUBLIC_OWNER_WHERE = { deletedAt: null, emailVerifiedAt: { not: null } } as const;

function tenantIdFromFolder(folder: string) {
  const match = folder.match(/^(?:logos|covers|company-profiles)\/([0-9a-f-]{20,64})$/i);
  return match?.[1] ?? null;
}

async function publicImageReferenceBusiness(storageKey: string) {
  const url = `/api/storage/${storageKey}`;
  return db.business.findFirst({
    where: {
      isPublished: true,
      deletedAt: null,
      owner: PUBLIC_OWNER_WHERE,
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
}

async function publicCompanyProfileBusiness(storageKey: string, tenantId: string | null) {
  const url = `/api/storage/${storageKey}`;
  return db.business.findFirst({
    where: {
      isPublished: true,
      deletedAt: null,
      owner: PUBLIC_OWNER_WHERE,
      companyProfileUrl: url,
      ...(tenantId ? { id: tenantId } : {}),
    },
    select: { id: true },
  });
}

async function loadAuthorizedBytes(storageKey: string) {
  try { return await readPersistentObject(storageKey); }
  catch (error) {
    console.error("[storage] failed to read persistent object", { storageKey, error });
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ storageKey: string }> }) {
  const { storageKey: rawStorageKey } = await params;
  const storageKey = String(rawStorageKey ?? "").trim();
  if (!/^[0-9a-f-]{20,64}$/i.test(storageKey)) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });

  await ensurePersistentStorageReady();

  const metadata = await db.storedObject.findUnique({
    where: { id: storageKey },
    select: { id: true, folder: true, fileName: true, mimeType: true, size: true },
  });
  if (!metadata) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  const tenantId = tenantIdFromFolder(metadata.folder);

  if ((metadata.folder === "company-profiles" || metadata.folder.startsWith("company-profiles/")) && metadata.mimeType === "application/pdf") {
    if (!(await publicCompanyProfileBusiness(metadata.id, tenantId))) {
      return NextResponse.json({ error: "الملف غير متاح" }, { status: 404 });
    }
    const stored = await loadAuthorizedBytes(storageKey);
    if (!stored) return NextResponse.json({ error: "تعذر قراءة الملف" }, { status: 503 });
    const safeName = metadata.fileName.replace(/[\r\n"\\]/g, "-") || "company-profile.pdf";
    return new NextResponse(new Uint8Array(stored.data), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(metadata.size),
        "Content-Disposition": `inline; filename="${safeName}"`,
        // Every file request re-checks current publication, owner verification and reference state.
        // A CDN cache must never keep serving a file after the customer becomes non-public or replaces it.
        "Cache-Control": AUTHORIZED_FILE_CACHE_CONTROL,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; sandbox",
      },
    });
  }

  if (!SAFE_IMAGE_MIME.has(metadata.mimeType)) return NextResponse.json({ error: "الملف غير متاح" }, { status: 404 });
  const referencingBusiness = await publicImageReferenceBusiness(metadata.id);
  if (!referencingBusiness || (tenantId && referencingBusiness.id !== tenantId)) {
    return NextResponse.json({ error: "الملف غير متاح" }, { status: 404 });
  }

  const stored = await loadAuthorizedBytes(storageKey);
  if (!stored) return NextResponse.json({ error: "تعذر قراءة الملف" }, { status: 503 });
  return new NextResponse(new Uint8Array(stored.data), {
    status: 200,
    headers: {
      "Content-Type": metadata.mimeType,
      "Content-Length": String(metadata.size),
      "Content-Disposition": "inline",
      "Cache-Control": AUTHORIZED_FILE_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
