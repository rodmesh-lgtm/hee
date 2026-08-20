import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = String(process.env.DATABASE_URL ?? "").trim();
if (!connectionString) throw new Error("DATABASE_URL is required");
const mode = process.argv.includes("--verify") ? "verify" : "seed";
if (mode === "seed" && process.env.ALLOW_BACKUP_RESTORE_AUDIT_SEED !== "true") {
  throw new Error("Refusing backup audit seed: set ALLOW_BACKUP_RESTORE_AUDIT_SEED=true only on an isolated database that will be backed up/restored for the test.");
}
const marker = "hee-backup-restore-audit";
const fileMarker = Buffer.from("hee-backup-file-marker-v1", "utf8");
const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seed() {
  const existing = await db.user.findUnique({ where: { email: `${marker}@hee.test` } });
  if (existing) return;
  const user = await db.user.create({ data: { name: "Backup Restore Audit", email: `${marker}@hee.test`, passwordHash: "audit-only" } });
  const business = await db.business.create({
    data: { ownerId: user.id, name: "Backup Restore Audit Business", slug: marker, businessType: "audit", shortDescription: "durable-marker" },
  });
  const service = await db.service.create({ data: { businessId: business.id, name: "Backup Restore Service", description: "retained-service-marker", price: 321, durationMinutes: 75 } });
  await db.branch.create({ data: { businessId: business.id, name: "Backup Restore Branch", city: "Riyadh", isMain: true } });
  const customer = await db.customer.create({ data: { businessId: business.id, name: "Backup Restore Customer", phone: "0555123456" } });
  const booking = await db.booking.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      serviceId: service.id,
      bookingDate: "2099-12-30",
      bookingTime: "14:15",
      status: "confirmed",
    },
  });
  await db.$executeRaw`
    INSERT INTO "BookingDurationSnapshot" ("bookingId", "durationMinutes")
    VALUES (${booking.id}, 75)
  `;
  const stored = await db.storedObject.create({
    data: {
      objectKey: `logos/${marker}.png`,
      folder: "logos",
      fileName: `${marker}.png`,
      mimeType: "image/png",
      size: fileMarker.length,
      storageDriver: "database",
      data: fileMarker,
    },
  });
  await db.business.update({ where: { id: business.id }, data: { logoUrl: `/api/storage/${stored.id}` } });
  console.log("backup-restore-audit: fixture seeded");
}

async function verify() {
  const user = await db.user.findUnique({ where: { email: `${marker}@hee.test` }, include: { businesses: { include: { services: true, branches: true, bookings: true } } } });
  const business = user?.businesses.find((item) => item.slug === marker);
  if (!business) throw new Error("Restored business fixture is missing");
  if (business.shortDescription !== "durable-marker") throw new Error("Restored business content does not match");
  if (!business.services.some((service) => service.description === "retained-service-marker" && service.price === 321 && service.durationMinutes === 75)) throw new Error("Restored service data is missing or changed");
  if (!business.branches.some((branch) => branch.name === "Backup Restore Branch" && branch.isMain)) throw new Error("Restored branch data is missing or changed");

  const booking = business.bookings.find((item) => item.bookingDate === "2099-12-30" && item.bookingTime === "14:15" && item.status === "confirmed");
  if (!booking) throw new Error("Restored booking fixture is missing or changed");
  const durationRows = await db.$queryRaw<Array<{ durationMinutes: number }>>`
    SELECT "durationMinutes" FROM "BookingDurationSnapshot" WHERE "bookingId" = ${booking.id}
  `;
  if (durationRows[0]?.durationMinutes !== 75) throw new Error("Restored booking duration snapshot is missing or changed");

  const storageId = String(business.logoUrl ?? "").split("/api/storage/")[1] ?? "";
  if (!storageId) throw new Error("Restored business lost its file reference");
  const stored = await db.storedObject.findUnique({ where: { id: storageId }, select: { storageDriver: true, data: true, size: true } });
  if (!stored || stored.storageDriver !== "database" || !stored.data) throw new Error("Restored StoredObject bytes are missing");
  const restoredBytes = Buffer.from(stored.data);
  if (stored.size !== fileMarker.length || !restoredBytes.equals(fileMarker)) throw new Error("Restored StoredObject bytes changed");

  console.log("backup-restore-audit: PASS");
}

(mode === "verify" ? verify() : seed())
  .catch((error) => {
    console.error("backup-restore-audit: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
