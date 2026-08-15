import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorageUploadResult = { url: string; mimeType: string; size: number; storageKey: string };
export interface StorageAdapter {
  upload(input: { file: File; folder: string }): Promise<StorageUploadResult>;
  remove(input: { storageKey: string; folder?: string }): Promise<void>;
}

type SafeMime = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function startsWithBytes(buffer: Buffer, bytes: number[]) {
  return buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
}

function detectSafeMime(buffer: Buffer): SafeMime | null {
  if (startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.length >= 6) {
    const gif = buffer.subarray(0, 6).toString("ascii");
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  return null;
}

function extensionForMime(mimeType: SafeMime) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "gif";
}

function validateFolderMime(folder: string, mimeType: SafeMime) {
  if (folder === "company-profiles") {
    if (mimeType !== "application/pdf") throw new Error("الملف التعريفي يجب أن يكون PDF صالحاً");
    return;
  }
  if (!mimeType.startsWith("image/")) throw new Error("هذا القسم يقبل الصور فقط");
}

async function prepareUpload(file: File, folder: string) {
  if (file.size <= 0) throw new Error("الملف غير صالح");
  const maxBytes = Number(process.env.UPLOAD_MAX_BYTES ?? process.env.COMPANY_PROFILE_MAX_BYTES ?? 5 * 1024 * 1024);
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) throw new Error("إعداد الحد الأقصى للملفات غير صالح");
  if (file.size > maxBytes) throw new Error("حجم الملف يجب أن يكون أقل من الحد المسموح");

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectSafeMime(buffer);
  if (!mimeType) throw new Error("نوع الملف غير مدعوم أو محتوى الملف لا يطابق نوعاً آمناً");
  validateFolderMime(folder, mimeType);

  const extension = extensionForMime(mimeType);
  const safeName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "file";
  return { buffer, mimeType, extension, safeName };
}

class LocalStorageAdapter implements StorageAdapter {
  async upload(input: { file: File; folder: string }): Promise<StorageUploadResult> {
    const { file, folder } = input;
    const prepared = await prepareUpload(file, folder);
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${prepared.safeName}.${prepared.extension}`;
    const relativeDir = path.posix.join("uploads", folder);
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(path.join(absoluteDir, fileName), prepared.buffer);
    return { url: `/${relativeDir}/${fileName}`, mimeType: prepared.mimeType, size: file.size, storageKey: path.posix.join(relativeDir, fileName) };
  }
  async remove(): Promise<void> {}
}

class DatabaseStorageAdapter implements StorageAdapter {
  async upload(input: { file: File; folder: string }): Promise<StorageUploadResult> {
    const { file, folder } = input;
    const prepared = await prepareUpload(file, folder);
    const fileName = `${prepared.safeName}.${prepared.extension}`;
    const objectKey = `${folder}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
    const { db } = await import("./db");
    await ensureStoredObjectTable();
    const stored = await db.storedObject.create({
      data: { objectKey, folder, fileName, mimeType: prepared.mimeType, size: file.size, data: prepared.buffer },
      select: { id: true, mimeType: true, size: true },
    });
    return { url: `/api/storage/${stored.id}`, mimeType: stored.mimeType, size: stored.size, storageKey: stored.id };
  }

  async remove(input: { storageKey: string; folder?: string }): Promise<void> {
    const storageKey = String(input.storageKey ?? "").trim();
    if (!storageKey) return;
    const { db } = await import("./db");
    await ensureStoredObjectTable();
    await db.storedObject.deleteMany({ where: { id: storageKey, ...(input.folder ? { folder: input.folder } : {}) } });
  }
}

let localAdapter: StorageAdapter | null = null;
let persistentAdapter: StorageAdapter | null = null;
let storageTableReady = false;

async function ensureStoredObjectTable() {
  if (storageTableReady) return;
  const { db } = await import("./db");
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StoredObject" (
      "id" TEXT NOT NULL,
      "objectKey" TEXT NOT NULL,
      "folder" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "size" INTEGER NOT NULL,
      "data" BYTEA NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "StoredObject_objectKey_key" ON "StoredObject"("objectKey")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoredObject_folder_idx" ON "StoredObject"("folder")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoredObject_createdAt_idx" ON "StoredObject"("createdAt")`);
  storageTableReady = true;
}

export function extractStorageKeyFromUrl(url: string | null | undefined) {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  let parsedPath = raw;
  if (raw.startsWith("http")) {
    try { parsedPath = new URL(raw).pathname; } catch { return ""; }
  }
  const marker = "/api/storage/";
  const index = parsedPath.indexOf(marker);
  if (index === -1) return "";
  const key = parsedPath.slice(index + marker.length).split("/")[0]?.trim() ?? "";
  return /^[0-9a-f-]{20,64}$/i.test(key) ? key : "";
}

export function getStorageAdapter() { return getPersistentStorageAdapter(); }
export function getPersistentStorageAdapter() {
  if (!persistentAdapter) persistentAdapter = new DatabaseStorageAdapter();
  return persistentAdapter;
}
export function getLocalDevelopmentStorageAdapter() {
  if (!localAdapter) localAdapter = new LocalStorageAdapter();
  return localAdapter;
}
export async function ensurePersistentStorageReady() { await ensureStoredObjectTable(); }
