import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = String(process.env.DATABASE_URL ?? "").trim();
if (!connectionString) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function expectDeleteBlocked(label: string, operation: () => Promise<unknown>) {
  let blocked = false;
  try {
    await operation();
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error(`${label}: destructive delete unexpectedly succeeded`);
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await db.user.create({
    data: { name: "Retention Audit", email: `retention-${suffix}@hee.test`, passwordHash: "audit-only" },
  });

  const business = await db.business.create({
    data: {
      ownerId: user.id,
      name: "Retention Audit Business",
      slug: `retention-audit-${suffix}`,
      businessType: "audit",
    },
  });

  const service = await db.service.create({
    data: { businessId: business.id, name: "Persistent service", price: 100 },
  });

  await db.business.update({ where: { id: business.id }, data: { deletedAt: new Date(), isPublished: false } });
  const retainedService = await db.service.findUnique({ where: { id: service.id }, select: { id: true } });
  if (!retainedService) throw new Error("Soft deleting a business removed child customer data");

  await expectDeleteBlocked("Business RESTRICT guard", () => db.business.delete({ where: { id: business.id } }));
  await expectDeleteBlocked("User RESTRICT guard", () => db.user.delete({ where: { id: user.id } }));

  // Explicit ordered cleanup models the only acceptable future hard-erasure shape:
  // deliberate child deletion followed by parent deletion.
  await db.service.delete({ where: { id: service.id } });
  await db.business.delete({ where: { id: business.id } });
  await db.user.delete({ where: { id: user.id } });

  console.log("data-retention-audit: PASS");
}

main()
  .catch((error) => {
    console.error("data-retention-audit: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
