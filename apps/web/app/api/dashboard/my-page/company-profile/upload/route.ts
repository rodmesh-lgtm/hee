import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { isQaAuditModeUser } from "../../../../../lib/qa-audit";
import { extractStorageKeyFromUrl, getPersistentStorageAdapter } from "../../../../../lib/storage";

const MAX_PDF_BYTES = Number(process.env.COMPANY_PROFILE_MAX_BYTES ?? 5 * 1024 * 1024);

function hasPdfMagic(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer.slice(0, 5));
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}
function hasPdfExtension(fileName: string) { return fileName.toLowerCase().endsWith(".pdf"); }

function getOwnedCompanyProfileStorageKey(pageModules: unknown) {
  if (!Array.isArray(pageModules)) return "";
  for (const rawModule of pageModules) {
    if (!rawModule || typeof rawModule !== "object") continue;
    const pageModule = rawModule as { id?: unknown; config?: unknown };
    if (pageModule.id !== "companyProfile" || !pageModule.config || typeof pageModule.config !== "object") continue;
    const config = pageModule.config as { companyProfile?: unknown };
    if (!config.companyProfile || typeof config.companyProfile !== "object") return "";
    const profile = config.companyProfile as { pdfStorageKey?: unknown; pdfUrl?: unknown };
    const explicitKey = typeof profile.pdfStorageKey === "string" ? profile.pdfStorageKey.trim() : "";
    if (explicitKey) return explicitKey;
    return extractStorageKeyFromUrl(typeof profile.pdfUrl === "string" ? profile.pdfUrl : "");
  }
  return "";
}

async function getOwnedBusiness(userId: string) {
  return db.business.findFirst({ where: { ownerId: userId, deletedAt: null }, select: { id: true, pageModules: true } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  if (await isQaAuditModeUser(user.id)) return NextResponse.json({ error: "وضع المعاينة QA للقراءة فقط" }, { status: 403 });
  const business = await getOwnedBusiness(user.id);
  if (!business) return NextResponse.json({ error: "لا يوجد نشاط مرتبط بهذا الحساب" }, { status: 404 });

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ error: "بيانات الرفع غير صالحة" }, { status: 400 }); }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "يرجى اختيار ملف PDF صالح" }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "حجم ملف PDF يجب أن يكون أقل من 5MB" }, { status: 400 });
  if (!hasPdfExtension(file.name)) return NextResponse.json({ error: "امتداد الملف يجب أن يكون PDF" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  if (!hasPdfMagic(buffer)) return NextResponse.json({ error: "الملف المرفوع ليس PDF صالحاً" }, { status: 400 });
  const normalizedPdfFile = new File([buffer], file.name, { type: "application/pdf", lastModified: Date.now() });

  try {
    const uploaded = await getPersistentStorageAdapter().upload({ file: normalizedPdfFile, folder: "company-profiles" });
    return NextResponse.json({ ok: true, url: uploaded.url, storageKey: uploaded.storageKey, fileName: file.name, size: file.size, mimeType: "application/pdf" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر رفع الملف" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  if (await isQaAuditModeUser(user.id)) return NextResponse.json({ error: "وضع المعاينة QA للقراءة فقط" }, { status: 403 });
  const business = await getOwnedBusiness(user.id);
  if (!business) return NextResponse.json({ error: "لا يوجد نشاط مرتبط بهذا الحساب" }, { status: 404 });

  let body: { storageKey?: string } = {};
  try { body = (await request.json()) as { storageKey?: string }; } catch { return NextResponse.json({ error: "بيانات الحذف غير صالحة" }, { status: 400 }); }
  const storageKey = String(body.storageKey ?? "").trim();
  if (!storageKey) return NextResponse.json({ ok: true });
  const ownedStorageKey = getOwnedCompanyProfileStorageKey(business.pageModules);
  if (!ownedStorageKey || storageKey !== ownedStorageKey) return NextResponse.json({ error: "الملف غير تابع لهذا النشاط" }, { status: 403 });

  await getPersistentStorageAdapter().remove({ storageKey, folder: "company-profiles" });
  return NextResponse.json({ ok: true });
}
