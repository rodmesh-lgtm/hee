import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorageUploadResult = { url: string; mimeType: string; size: number; storageKey: string };
export interface StorageAdapter {
  upload(input: { file: File; folder: string }): Promise<StorageUploadResult>;
  remove(input: { storageKey: string; folder?: string }): Promise<void>;
}

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function getFileExtension(file: File) {
  const original = file.name.split(".").pop()?.toLowerCase();
  if (original && original.length <= 5) return original;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/svg+xml") return "svg";
  if (file.type === "application/pdf") return "pdf";
  return "bin";
}

// Kept only as an explicit development adapter. Production-facing application code
// must use getStorageAdapter()/getPersistentStorageAdapter(), both of which are persistent.
class LocalStorageAdapter implements StorageAdapter {
  async upload(input: { file: File; folder: string }): Promise<StorageUploadResult> {
    const { file, folder } = input;
    if (file.size <= 0) throw new Error("الملف غير صالح");
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error("حجم الملف يجب أن يكون أقل من 5MB");
    const extension = getFileExtension(file);
    const safeName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "file";
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeName}.${extension}`;
    const relativeDir = path.posix.join("uploads", folder);
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const absolutePath = path.join(absoluteDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);
    return { url: `/${relativeDir}/${fileName}`, mimeType: file.type || "application/octet-stream", size: file.size, storageKey: path.posix.join(relativeDir, fileName) };
  }
  async remove(): Promise<void> {}
}

class DatabaseStorageAdapter implements StorageAdapter {
  async upload(input: { file: File; folder: string }): Promise<StorageUploadResult> {
    const { file, folder } = input;
    if (file.size <= 0) throw new Error("الملف غير صالح");
    const maxBytes = Number(process.env.UPLOAD_MAX_BYTES ?? process.env.COMPANY_PROFILE_MAX_BYTES ?? 5 * 1024 * 1024);
    if (!Number.isFinite(maxBytes) || maxBytes <= 0) throw new Error("إعداد الحد الأقصى للملفات غير صالح");
    if (file.size > maxBytes) throw new Error("حجم الملف يجب أن يكون أقل من الحد المسموح");
    const extension = getFileExtension(file);
    const safeName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "file";
    const objectKey = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { db } = await import("./db");
    await ensureStoredObjectTable();
    const stored = await db.storedObject.create({
      data: { objectKey, folder, fileName: `${safeName}.${extension}`, mimeType: file.type || "application/octet-stream", size: file.size, data: buffer },
      select: { id: true, mimeType: true, size: true },
    });
    return { url: `/api/storage/${stored.id}`, mimeType: stored.mimeType, size: stored.size, storageKey: stored.id };
  }
  async remove(input: { storageKey: string }): Promise<void> {
    const storageKey = String(input.storageKey ?? "").trim();
    if (!storageKey) return;
    const { db } = await import("./db");
    await ensureStoredObjectTable();
    await db.storedObject.deleteMany({ where: { id: storageKey } });
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
  const parsedPath = raw.startsWith("http") ? new URL(raw).pathname : raw;
  const marker = "/api/storage/";
  const index = parsedPath.indexOf(marker);
  if (index === -1) return "";
  return parsedPath.slice(index + marker.length).split("/")[0]?.trim() ?? "";
}

// Canonical application adapter. Keeping this name preserves existing callers while
// making storage portable across Vercel today and a Hetzner VPS/container deployment later.
export function getStorageAdapter() {
  return getPersistentStorageAdapter();
}

export function getPersistentStorageAdapter() {
  if (!persistentAdapter) persistentAdapter = new DatabaseStorageAdapter();
  return persistentAdapter;
}

export function getLocalDevelopmentStorageAdapter() {
  if (!localAdapter) localAdapter = new LocalStorageAdapter();
  return localAdapter;
}

export async function ensurePersistentStorageReady() { await ensureStoredObjectTable(); }
