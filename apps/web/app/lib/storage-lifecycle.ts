import { db } from "./db";
import { ensurePersistentStorageReady, extractStorageKeyFromUrl, getPersistentStorageAdapter } from "./storage";

export async function validateStoredObject(storageKey: string, folder?: string) {
  const key = String(storageKey ?? "").trim();
  if (!key) return null;
  // Compatibility guard for RC deployments that may receive application code before the
  // formal portable-storage migration is applied. The operation is idempotent.
  await ensurePersistentStorageReady();
  return db.storedObject.findFirst({
    where: { id: key, ...(folder ? { folder } : {}) },
    select: { id: true, folder: true, mimeType: true, size: true },
  });
}

export async function removePersistentUrl(url: string | null | undefined, folder?: string) {
  const storageKey = extractStorageKeyFromUrl(url);
  if (!storageKey) return;
  const object = await validateStoredObject(storageKey, folder);
  if (!object) return;
  await getPersistentStorageAdapter().remove({ storageKey, folder });
}

export async function removePersistentKey(storageKey: string | null | undefined, folder?: string) {
  const key = String(storageKey ?? "").trim();
  if (!key) return;
  const object = await validateStoredObject(key, folder);
  if (!object) return;
  await getPersistentStorageAdapter().remove({ storageKey: key, folder });
}

export async function removeReplacedPersistentUrl(previousUrl: string | null | undefined, nextUrl: string | null | undefined, folder?: string) {
  const previousKey = extractStorageKeyFromUrl(previousUrl);
  const nextKey = extractStorageKeyFromUrl(nextUrl);
  if (!previousKey || previousKey === nextKey) return;
  await removePersistentKey(previousKey, folder);
}
