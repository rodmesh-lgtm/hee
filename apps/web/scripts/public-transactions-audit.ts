import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = String(process.env.DATABASE_URL ?? "").trim();
if (!connectionString) throw new Error("DATABASE_URL is required");
if (process.env.ALLOW_PUBLIC_TRANSACTIONS_AUDIT !== "true") {
  throw new Error("Refusing public-transactions audit outside an isolated test database");
}

const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function expectBlocked(label: string, operation: () => Promise<unknown>) {
  let blocked = false;
  try { await operation(); } catch { blocked = true; }
  if (!blocked) throw new Error(`${label}: operation unexpectedly succeeded`);
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await db.user.create({ data: { name: "Public Transaction Audit", email: `public-tx-${suffix}@hee.test`, passwordHash: "audit-only" } });
  const business = await db.business.create({
    data: {
      ownerId: user.id,
      name: "Public Transaction Audit",
      slug: `public-tx-${suffix}`,
      businessType: "audit",
      isPublished: true,
      acceptOnlineOrders: true,
      bookingAvailable: true,
    },
  });
  const customer = await db.customer.create({ data: { businessId: business.id, name: "Audit Customer", phone: `9665${Date.now().toString().slice(-8)}` } });
  const product = await db.product.create({ data: { businessId: business.id, name: "Audit Product", price: 2500 } });
  const service = await db.service.create({ data: { businessId: business.id, name: "Audit Service", price: 5000, durationMinutes: 60, bookingEnabled: true } });

  const order = await db.order.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      status: "pending",
      orderType: "pickup",
      total: 2500,
      items: { create: [{ productId: product.id, name: product.name, unitPrice: 2500, quantity: 1, total: 2500 }] },
    },
  });

  await expectBlocked("Order status constraint", () => db.$executeRaw`UPDATE "Order" SET "status" = 'typo_status' WHERE "id" = ${order.id}`);
  await expectBlocked("Order type constraint", () => db.$executeRaw`UPDATE "Order" SET "orderType" = 'unknown_type' WHERE "id" = ${order.id}`);
  await expectBlocked("Order total constraint", () => db.$executeRaw`UPDATE "Order" SET "total" = -1 WHERE "id" = ${order.id}`);

  const booking = await db.booking.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      serviceId: service.id,
      bookingDate: "2099-12-30",
      bookingTime: "10:30",
      status: "pending",
    },
  });
  await expectBlocked("Active booking slot uniqueness", () => db.booking.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      serviceId: service.id,
      bookingDate: "2099-12-30",
      bookingTime: "10:30",
      status: "confirmed",
    },
  }));
  await expectBlocked("Booking date shape constraint", () => db.$executeRaw`UPDATE "Booking" SET "bookingDate" = '30/12/2099' WHERE "id" = ${booking.id}`);
  await expectBlocked("Booking calendar validity constraint", () => db.$executeRaw`UPDATE "Booking" SET "bookingDate" = '2099-02-30' WHERE "id" = ${booking.id}`);
  await expectBlocked("Booking status constraint", () => db.$executeRaw`UPDATE "Booking" SET "status" = 'typo_status' WHERE "id" = ${booking.id}`);

  await db.$executeRaw`
    INSERT INTO "BookingDurationSnapshot" ("bookingId", "durationMinutes")
    VALUES (${booking.id}, 60)
  `;
  await expectBlocked("Booking duration snapshot range", () => db.$executeRaw`
    UPDATE "BookingDurationSnapshot" SET "durationMinutes" = 0 WHERE "bookingId" = ${booking.id}
  `);
  await expectBlocked("Booking duration snapshot foreign key", () => db.$executeRaw`
    INSERT INTO "BookingDurationSnapshot" ("bookingId", "durationMinutes")
    VALUES (${`missing-${suffix}`}, 30)
  `);

  await db.$executeRaw`
    INSERT INTO "PublicSubmission" ("businessId", "scope", "idempotencyKey", "targetId")
    VALUES (${business.id}, 'order', ${`audit-${suffix}`}, ${order.id})
  `;
  await expectBlocked("Public submission idempotency uniqueness", () => db.$executeRaw`
    INSERT INTO "PublicSubmission" ("businessId", "scope", "idempotencyKey", "targetId")
    VALUES (${business.id}, 'order', ${`audit-${suffix}`}, ${order.id})
  `;

  await db.$executeRaw`DELETE FROM "PublicSubmission" WHERE "businessId" = ${business.id}`;
  await db.booking.delete({ where: { id: booking.id } });
  const snapshotAfterBookingDelete = await db.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS "count" FROM "BookingDurationSnapshot" WHERE "bookingId" = ${booking.id}
  `;
  if ((snapshotAfterBookingDelete[0]?.count ?? -1) !== 0) throw new Error("Booking duration snapshot cascade: orphan row remains");
  await db.orderItem.deleteMany({ where: { orderId: order.id } });
  await db.order.delete({ where: { id: order.id } });
  await db.product.delete({ where: { id: product.id } });
  await db.service.delete({ where: { id: service.id } });
  await db.customer.delete({ where: { id: customer.id } });
  await db.business.delete({ where: { id: business.id } });
  await db.user.delete({ where: { id: user.id } });

  console.log("public-transactions-audit: PASS");
}

main()
  .catch((error) => { console.error("public-transactions-audit: FAIL", error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); await pool.end(); });
