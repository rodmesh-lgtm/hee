import { createHash, createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorageUploadResult = { url: string; mimeType: string; size: number; storageKey: string };
export type StorageReadResult = { id: string; objectKey: string; folder: string; fileName: string; mimeType: string; size: number; storageDriver: string; data: Buffer };
export interface StorageAdapter {
  upload(input: { file: File; folder: string }): Promise<StorageUploadResult>;
  remove(input: { storageKey: string; folder?: string }): Promise<void>;
}

type SafeMime = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/gif";
type PersistentDriver = "database" | "s3";

type S3Config = {
  endpoint: URL;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

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

function configuredDriver(): PersistentDriver {
  const value = String(process.env.STORAGE_DRIVER ?? "database").trim().toLowerCase();
  if (value === "database" || value === "s3") return value;
  throw new Error(`STORAGE_DRIVER غير مدعوم: ${value}`);
}

function requiredEnv(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`إعداد التخزين ${name} غير موجود`);
  return value;
}

function s3Config(): S3Config {
  const endpoint = new URL(requiredEnv("S3_ENDPOINT"));
  if (endpoint.protocol !== "https:" && process.env.S3_ALLOW_INSECURE !== "true") {
    throw new Error("S3_ENDPOINT يجب أن يستخدم HTTPS إلا عند تفعيل S3_ALLOW_INSECURE صراحة للتطوير المحلي");
  }
  return {
    endpoint,
    region: requiredEnv("S3_REGION"),
    bucket: requiredEnv("S3_BUCKET"),
    accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  };
}

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}
function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}
function awsTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}
function encodeS3Key(key: string) {
  return key.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function s3ObjectUrl(config: S3Config, objectKey: string) {
  const url = new URL(config.endpoint.toString());
  const endpointPath = url.pathname.replace(/\/$/, "");
  const encodedKey = encodeS3Key(objectKey);
  if (config.forcePathStyle) {
    url.pathname = `${endpointPath}/${encodeURIComponent(config.bucket)}/${encodedKey}`.replace(/\/+/g, "/");
  } else {
    url.hostname = `${config.bucket}.${url.hostname}`;
    url.pathname = `${endpointPath}/${encodedKey}`.replace(/\/+/g, "/");
  }
  url.search = "";
  return url;
}

async function signedS3Request(method: "GET" | "PUT" | "DELETE", objectKey: string, body?: Buffer, contentType?: string) {
  const config = s3Config();
  const url = s3ObjectUrl(config, objectKey);
  const timestamp = awsTimestamp();
  const dateStamp = timestamp.slice(0, 8);
  const payloadHash = sha256(body ?? Buffer.alloc(0));
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${timestamp}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", timestamp, scope, sha256(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    Authorization: authorization,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": timestamp,
  };
  if (contentType) headers["Content-Type"] = contentType;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
    cache: "no-store",
  });
  if (!response.ok && !(method === "DELETE" && response.status === 404)) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`S3 ${method} فشل (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return response;
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

class PersistentStorageAdapter implements StorageAdapter {
  async upload(input: { file: File; folder: string }): Promise<StorageUploadResult> {
    const { file, folder } = input;
    const prepared = await prepareUpload(file, folder);
    const fileName = `${prepared.safeName}.${prepared.extension}`;
    const objectKey = `${folder}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
    const driver = configuredDriver();
    const { db } = await import("./db");
    await ensureStoredObjectTable();

    if (driver === "s3") {
      await signedS3Request("PUT", objectKey, prepared.buffer, prepared.mimeType);
      try {
        const stored = await db.storedObject.create({
          data: { objectKey, folder, fileName, mimeType: prepared.mimeType, size: file.size, storageDriver: "s3", data: null },
          select: { id: true, mimeType: true, size: true },
        });
        return { url: `/api/storage/${stored.id}`, mimeType: stored.mimeType, size: stored.size, storageKey: stored.id };
      } catch (error) {
        await signedS3Request("DELETE", objectKey).catch(() => undefined);
        throw error;
      }
    }

    const stored = await db.storedObject.create({
      data: { objectKey, folder, fileName, mimeType: prepared.mimeType, size: file.size, storageDriver: "database", data: prepared.buffer },
      select: { id: true, mimeType: true, size: true },
    });
    return { url: `/api/storage/${stored.id}`, mimeType: stored.mimeType, size: stored.size, storageKey: stored.id };
  }

  async remove(input: { storageKey: string; folder?: string }): Promise<void> {
    const storageKey = String(input.storageKey ?? "").trim();
    if (!storageKey) return;
    const { db } = await import("./db");
    await ensureStoredObjectTable();
    const stored = await db.storedObject.findFirst({
      where: { id: storageKey, ...(input.folder ? { folder: input.folder } : {}) },
      select: { id: true, objectKey: true, storageDriver: true },
    });
    if (!stored) return;
    if (stored.storageDriver === "s3") await signedS3Request("DELETE", stored.objectKey);
    await db.storedObject.deleteMany({ where: { id: stored.id } });
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
      "storageDriver" TEXT NOT NULL DEFAULT 'database',
      "data" BYTEA,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`ALTER TABLE "StoredObject" ADD COLUMN IF NOT EXISTS "storageDriver" TEXT NOT NULL DEFAULT 'database'`);
  await db.$executeRawUnsafe(`ALTER TABLE "StoredObject" ALTER COLUMN "data" DROP NOT NULL`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "StoredObject_objectKey_key" ON "StoredObject"("objectKey")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoredObject_folder_idx" ON "StoredObject"("folder")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoredObject_storageDriver_idx" ON "StoredObject"("storageDriver")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoredObject_createdAt_idx" ON "StoredObject"("createdAt")`);
  storageTableReady = true;
}

export async function readPersistentObject(storageKey: string): Promise<StorageReadResult | null> {
  const key = String(storageKey ?? "").trim();
  if (!key) return null;
  const { db } = await import("./db");
  await ensureStoredObjectTable();
  const stored = await db.storedObject.findUnique({
    where: { id: key },
    select: { id: true, objectKey: true, folder: true, fileName: true, mimeType: true, size: true, storageDriver: true, data: true },
  });
  if (!stored) return null;

  if (stored.storageDriver === "s3") {
    const response = await signedS3Request("GET", stored.objectKey);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length !== stored.size) throw new Error("حجم الملف في Object Storage لا يطابق البيانات المسجلة");
    return { ...stored, data };
  }

  if (!stored.data) throw new Error("بيانات الملف غير متاحة في قاعدة البيانات");
  return { ...stored, storageDriver: stored.storageDriver || "database", data: Buffer.from(stored.data) };
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
  if (!persistentAdapter) persistentAdapter = new PersistentStorageAdapter();
  return persistentAdapter;
}
export function getLocalDevelopmentStorageAdapter() {
  if (!localAdapter) localAdapter = new LocalStorageAdapter();
  return localAdapter;
}
export async function ensurePersistentStorageReady() { await ensureStoredObjectTable(); }
