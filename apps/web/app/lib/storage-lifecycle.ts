import { db } from "./db";
import { ensurePersistentStorageReady, extractStorageKeyFromUrl, getPersistentStorageAdapter } from "./storage";

export async function validateStoredObject(storageKey: string, folder?: string) {
  const key = String(storageKey ?? "").trim();
  if (!key) return null;
  await ensurePersistentStorageReady();
  return db.storedObject.findFirst({
    where: { id: key, ...(folder ? { folder } : {}) },
    select: { id: true, folder: true, mimeType: true, size: true },
  });
}

function jsonReferencesUrl(value: unknown, url: string) {
  try { return JSON.stringify(value ?? null).includes(url); } catch { return false; }
}

/**
 * Customer files are durable data. Never physically delete an object while any
 * tenant record still references it, including soft-deleted/inactive records.
 * This makes replacement cleanup safe without making billing or publication state
 * part of the retention decision.
 */
export async function isPersistentObjectReferenced(storageKey: string) {
  const key = String(storageKey ?? "").trim();
  if (!key) return false;
  const url = `/api/storage/${key}`;

  const directBusiness = await db.business.findFirst({
    where: {
      OR: [
        { logoUrl: url },
        { coverUrl: url },
        { companyProfileUrl: url },
        { products: { some: { imageUrl: url } } },
        { services: { some: { imageUrl: url } } },
        { offers: { some: { imageUrl: url } } },
        { galleryItems: { some: { imageUrl: url } } },
        { contactPersons: { some: { imageUrl: url } } },
      ],
    },
    select: { id: true },
  });
  if (directBusiness) return true;

  // pageModules is JSON and may contain current or legacy module-owned files.
  // Deliberately include unpublished and soft-deleted businesses: retention is
  // independent from visibility/subscription state.
  const moduleCandidates = await db.business.findMany({
    where: { pageModules: { not: null } },
    select: { pageModules: true },
  });
  return moduleCandidates.some((business) => jsonReferencesUrl(business.pageModules, url));
}

export async function removePersistentUrl(url: string | null | undefined, folder?: string) {
  const storageKey = extractStorageKeyFromUrl(url);
  if (!storageKey) return;
  await removePersistentKey(storageKey, folder);
}

export async function removePersistentKey(storageKey: string | null | undefined, folder?: string) {
  const key = String(storageKey ?? "").trim();
  if (!key) return;
  const object = await validateStoredObject(key, folder);
  if (!object) return;
  if (await isPersistentObjectReferenced(key)) return;
  await getPersistentStorageAdapter().remove({ storageKey: key, folder });
}

export async function removeReplacedPersistentUrl(previousUrl: string | null | undefined, nextUrl: string | null | undefined, folder?: string) {
  const previousKey = extractStorageKeyFromUrl(previousUrl);
  const nextKey = extractStorageKeyFromUrl(nextUrl);
  if (!previousKey || previousKey === nextKey) return;
  await removePersistentKey(previousKey, folder);
}
