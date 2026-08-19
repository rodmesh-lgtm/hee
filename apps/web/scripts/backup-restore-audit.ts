import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = String(process.env.DATABASE_URL ?? "").trim();
if (!connectionString) throw new Error("DATABASE_URL is required");
const mode = process.argv.includes("--verify") ? "verify" : "seed";
const marker = "hee-backup-restore-audit";
const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seed() {
  const existing = await db.user.findUnique({ where: { email: `${marker}@hee.test` } });
  if (existing) return;
  const user = await db.user.create({ data: { name: "Backup Restore Audit", email: `${marker}@hee.test`, passwordHash: "audit-only" } });
  const business = await db.business.create({
    data: { ownerId: user.id, name: "Backup Restore Audit Business", slug: marker, businessType: "audit", shortDescription: "durable-marker" },
  });
  await db.service.create({ data: { businessId: business.id, name: "Backup Restore Service", description: "retained-service-marker", price: 321 } });
  await db.branch.create({ data: { businessId: business.id, name: "Backup Restore Branch", city: "Riyadh", isMain: true } });
  console.log("backup-restore-audit: fixture seeded");
}

async function verify() {
  const user = await db.user.findUnique({ where: { email: `${marker}@hee.test` }, include: { businesses: { include: { services: true, branches: true } } } });
  const business = user?.businesses.find((item) => item.slug === marker);
  if (!business) throw new Error("Restored business fixture is missing");
  if (business.shortDescription !== "durable-marker") throw new Error("Restored business content does not match");
  if (!business.services.some((service) => service.description === "retained-service-marker" && service.price === 321)) throw new Error("Restored service data is missing or changed");
  if (!business.branches.some((branch) => branch.name === "Backup Restore Branch" && branch.isMain)) throw new Error("Restored branch data is missing or changed");
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
