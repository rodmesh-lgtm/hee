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
const billingGivenId = "00000000-0000-4000-8000-000000000042";
const billingProviderId = "audit_payment_hee_backup_restore";
const receiptSellerName = "HEE Backup Audit Seller";
const receiptSellerAddress = "Riyadh, Saudi Arabia — audit fixture";
const receiptIssuedAt = new Date("2099-01-01T00:00:01.000Z");
const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seed() {
  const existing = await db.user.findUnique({ where: { email: `${marker}@hee.test` } });
  if (existing) return;
  const paidPlan = await db.businessPlan.upsert({
    where: { code: "BUSINESS" },
    update: { name: "Business", monthlyPrice: 199, productLimit: 10, isActive: true },
    create: { code: "BUSINESS", name: "Business", monthlyPrice: 199, productLimit: 10, isActive: true },
  });
  const user = await db.user.create({ data: { name: "Backup Restore Audit", email: `${marker}@hee.test`, passwordHash: "audit-only" } });
  const business = await db.business.create({
    data: { ownerId: user.id, planId: paidPlan.id, name: "Backup Restore Audit Business", slug: marker, businessType: "audit", shortDescription: "durable-marker" },
  });
  const service = await db.service.create({ data: { businessId: business.id, name: "Backup Restore Service", description: "retained-service-marker", price: 321, durationMinutes: 75 } });
  await db.branch.create({ data: { businessId: business.id, name: "Backup Restore Branch", city: "Riyadh", isMain: true } });
  const customer = await db.customer.create({ data: { businessId: business.id, name: "Backup Restore Customer", phone: "0555123456" } });
  const booking = await db.booking.create({
    data: { businessId: business.id, customerId: customer.id, serviceId: service.id, bookingDate: "2099-12-30", bookingTime: "14:15", status: "confirmed" },
  });
  await db.$executeRaw`INSERT INTO "BookingDurationSnapshot" ("bookingId", "durationMinutes") VALUES (${booking.id}, 75)`;

  // Financial state must survive the same backup/restore path as customer records. Use
  // inert audit-only token material; no real provider/card token is involved.
  const paymentMethod = await db.billingPaymentMethod.create({
    data: {
      businessId: business.id,
      provider: "moyasar",
      encryptedToken: "audit-only-not-a-real-provider-token",
      brand: "audit",
      last4: "4242",
      status: "active",
    },
  });
  const subscription = await db.subscription.create({
    data: {
      businessId: business.id,
      planId: paidPlan.id,
      status: "active",
      provider: "moyasar",
      providerReference: billingProviderId,
      autoRenew: true,
      paymentMethodId: paymentMethod.id,
      startsAt: new Date("2099-01-01T00:00:00.000Z"),
      endsAt: new Date("2099-02-01T00:00:00.000Z"),
    },
  });
  const billingPayment = await db.billingPayment.create({
    data: {
      businessId: business.id,
      planId: paidPlan.id,
      subscriptionId: subscription.id,
      provider: "moyasar",
      providerPaymentId: billingProviderId,
      providerGivenId: billingGivenId,
      kind: "initial",
      amount: 19900,
      currency: "SAR",
      status: "paid",
      paidAt: receiptIssuedAt,
      receiptSellerLegalName: receiptSellerName,
      receiptSellerAddress,
      receiptTaxStatus: "not_registered",
      receiptNetAmount: 19900,
      receiptVatAmount: 0,
      receiptIssuedAt,
    },
  });
  await db.billingWebhookEvent.create({
    data: {
      provider: "moyasar",
      providerEventId: "audit_event_hee_backup_restore",
      eventType: "payment_paid",
      billingPaymentId: billingPayment.id,
      processedAt: new Date("2099-01-01T00:00:02.000Z"),
    },
  });

  const stored = await db.storedObject.create({
    data: { objectKey: `logos/${marker}.png`, folder: "logos", fileName: `${marker}.png`, mimeType: "image/png", size: fileMarker.length, storageDriver: "database", data: fileMarker },
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
  const durationRows = await db.$queryRaw<Array<{ durationMinutes: number }>>`SELECT "durationMinutes" FROM "BookingDurationSnapshot" WHERE "bookingId" = ${booking.id}`;
  if (durationRows[0]?.durationMinutes !== 75) throw new Error("Restored booking duration snapshot is missing or changed");

  const billing = await db.billingPayment.findUnique({
    where: { providerGivenId: billingGivenId },
    include: { subscription: { include: { paymentMethod: true } }, webhookEvents: true },
  });
  if (!billing || billing.businessId !== business.id || billing.amount !== 19900 || billing.currency !== "SAR" || billing.status !== "paid") {
    throw new Error("Restored billing payment ledger is missing or changed");
  }
  if (billing.providerPaymentId !== billingProviderId || billing.subscription?.provider !== "moyasar" || !billing.subscription.autoRenew) {
    throw new Error("Restored subscription billing lineage is missing or changed");
  }
  if (billing.subscription.paymentMethod?.last4 !== "4242" || billing.subscription.paymentMethod.status !== "active") {
    throw new Error("Restored billing payment method metadata is missing or changed");
  }
  if (
    billing.receiptSellerLegalName !== receiptSellerName ||
    billing.receiptSellerAddress !== receiptSellerAddress ||
    billing.receiptTaxStatus !== "not_registered" ||
    billing.receiptNetAmount !== 19900 ||
    billing.receiptVatAmount !== 0 ||
    billing.receiptIssuedAt?.toISOString() !== receiptIssuedAt.toISOString()
  ) {
    throw new Error("Restored immutable receipt snapshot is missing or changed");
  }
  if (!billing.webhookEvents.some((event) => event.eventType === "payment_paid" && event.processedAt)) {
    throw new Error("Restored billing webhook audit trail is missing or changed");
  }

  const storageId = String(business.logoUrl ?? "").split("/api/storage/")[1] ?? "";
  if (!storageId) throw new Error("Restored business lost its file reference");
  const stored = await db.storedObject.findUnique({ where: { id: storageId }, select: { storageDriver: true, data: true, size: true } });
  if (!stored || stored.storageDriver !== "database" || !stored.data) throw new Error("Restored StoredObject bytes are missing");
  const restoredBytes = Buffer.from(stored.data);
  if (stored.size !== fileMarker.length || !restoredBytes.equals(fileMarker)) throw new Error("Restored StoredObject bytes changed");

  console.log("backup-restore-audit: PASS");
}

(mode === "verify" ? verify() : seed())
  .catch((error) => { console.error("backup-restore-audit: FAIL", error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); await pool.end(); });
