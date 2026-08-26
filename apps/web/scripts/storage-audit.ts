import { PrismaClient } from "@prisma/client";
import { removePersistentKey } from "../app/lib/storage-lifecycle";

const db = new PrismaClient();
const deleteRequested = process.argv.includes("--delete");
const deleteAllowed = process.env.ALLOW_STORAGE_ORPHAN_DELETE === "true";
// Seven days by default: uploads are customer data and should never be reclaimed
// aggressively. The sweep is a reviewed maintenance tool, not a billing/expiry job.
const graceHours = Number(process.env.STORAGE_ORPHAN_GRACE_HOURS ?? 24 * 7);
const graceMs = Number.isFinite(graceHours) && graceHours >= 0 ? graceHours * 60 * 60 * 1000 : 24 * 7 * 60 * 60 * 1000;

function storageKeyFromUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try { path = new URL(raw).pathname; } catch { return ""; }
  }
  const match = path.match(/\/api\/storage\/([0-9a-f-]{20,64})(?:\/|$)/i);
  return match?.[1] ?? "";
}

function collectJsonStorageKeys(value: unknown, target: Set<string>) {
  if (typeof value === "string") {
    const direct = storageKeyFromUrl(value);
    if (direct) target.add(direct);
    const matches = value.matchAll(/\/api\/storage\/([0-9a-f-]{20,64})/gi);
    for (const match of matches) if (match[1]) target.add(match[1]);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonStorageKeys(item, target);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectJsonStorageKeys(item, target);
  }
}

async function main() {
  const referenced = new Set<string>();
  const addUrl = (value: unknown) => { const key = storageKeyFromUrl(value); if (key) referenced.add(key); };

  const [businesses, products, services, offers, gallery, contacts, objects] = await Promise.all([
    // Intentionally include unpublished, inactive and soft-deleted tenant records.
    // Retention is independent from subscription and visibility state.
    db.business.findMany({ select: { logoUrl: true, coverUrl: true, companyProfileUrl: true, pageModules: true } }),
    db.product.findMany({ select: { imageUrl: true } }),
    db.service.findMany({ select: { imageUrl: true } }),
    db.offer.findMany({ select: { imageUrl: true } }),
    db.galleryItem.findMany({ select: { imageUrl: true } }),
    db.contactPerson.findMany({ select: { imageUrl: true } }),
    db.storedObject.findMany({ select: { id: true, objectKey: true, folder: true, fileName: true, size: true, storageDriver: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
  ]);

  for (const business of businesses) {
    addUrl(business.logoUrl); addUrl(business.coverUrl); addUrl(business.companyProfileUrl);
    collectJsonStorageKeys(business.pageModules, referenced);
  }
  for (const row of products) addUrl(row.imageUrl);
  for (const row of services) addUrl(row.imageUrl);
  for (const row of offers) addUrl(row.imageUrl);
  for (const row of gallery) addUrl(row.imageUrl);
  for (const row of contacts) addUrl(row.imageUrl);

  const now = Date.now();
  const orphans = objects.filter((object) => !referenced.has(object.id));
  const eligible = orphans.filter((object) => now - object.createdAt.getTime() >= graceMs);
  const totalBytes = objects.reduce((sum, object) => sum + object.size, 0);
  const orphanBytes = orphans.reduce((sum, object) => sum + object.size, 0);
  const eligibleBytes = eligible.reduce((sum, object) => sum + object.size, 0);

  console.log(JSON.stringify({
    storageObjects: objects.length,
    referencedObjects: objects.length - orphans.length,
    orphanObjects: orphans.length,
    eligibleOrphans: eligible.length,
    totalBytes,
    orphanBytes,
    eligibleBytes,
    graceHours,
    deleteRequested,
    deleteAllowed,
  }, null, 2));

  if (eligible.length) {
    console.table(eligible.slice(0, 100).map((object) => ({ id: object.id, driver: object.storageDriver, folder: object.folder, fileName: object.fileName, size: object.size, createdAt: object.createdAt.toISOString() })));
    if (eligible.length > 100) console.log(`... ${eligible.length - 100} more eligible orphan objects`);
  }

  if (!deleteRequested) return;
  if (!deleteAllowed) throw new Error("Refusing deletion: set ALLOW_STORAGE_ORPHAN_DELETE=true together with --delete after reviewing the dry-run report.");
  if (!eligible.length) return;

  let deletedCount = 0;
  let deletedBytes = 0;
  for (const object of eligible) {
    // Re-check live references immediately before each physical delete. This closes
    // the race where an object was orphaned during the audit but became attached to
    // customer data before the sweep reached it.
    await removePersistentKey(object.id, object.folder);
    const stillExists = await db.storedObject.findUnique({ where: { id: object.id }, select: { id: true } });
    if (stillExists) continue;
    deletedCount += 1;
    deletedBytes += object.size;
  }
  console.log(`Deleted ${deletedCount} reviewed orphan storage objects (${deletedBytes} bytes).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
