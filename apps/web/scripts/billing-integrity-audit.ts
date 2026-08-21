import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

const connectionString = String(process.env.DATABASE_URL ?? "").trim();
if (!connectionString) throw new Error("DATABASE_URL is required");
if (process.env.ALLOW_BILLING_INTEGRITY_AUDIT !== "true" || process.env.APP_ENV !== "test") {
  throw new Error("Refusing billing integrity audit outside explicit test runtime");
}

const pool = new Pool({ connectionString, max: 1 });

async function mustReject(client: PoolClient, sql: string, expectedCode: string, label: string) {
  await client.query("SAVEPOINT billing_integrity_case");
  try {
    await client.query(sql);
    assert.fail(`${label}: database unexpectedly accepted invalid financial state`);
  } catch (error) {
    const code = String((error as { code?: string }).code ?? "");
    assert.equal(code, expectedCode, `${label}: expected PostgreSQL ${expectedCode}, received ${code || "unknown"}`);
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT billing_integrity_case");
    await client.query("RELEASE SAVEPOINT billing_integrity_case");
  }
}

async function main() {
  const client = await pool.connect();
  const suffix = randomUUID();
  const planId = `billing-audit-plan-${suffix}`;
  const userA = `billing-audit-user-a-${suffix}`;
  const userB = `billing-audit-user-b-${suffix}`;
  const businessA = `billing-audit-business-a-${suffix}`;
  const businessB = `billing-audit-business-b-${suffix}`;
  const methodA = `billing-audit-method-a-${suffix}`;
  const methodB = `billing-audit-method-b-${suffix}`;
  const subscriptionA = `billing-audit-sub-a-${suffix}`;
  const subscriptionB = `billing-audit-sub-b-${suffix}`;

  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO "BusinessPlan" ("id","code","name","monthlyPrice","productLimit","aiEnabled","onlinePay","isActive","createdAt","updatedAt") VALUES ($1,$2,'Billing Audit',199,10,false,true,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [planId, `BILLING_AUDIT_${suffix}`]);
    await client.query(`INSERT INTO "User" ("id","name","email","createdAt","updatedAt") VALUES ($1,'Audit A',$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),($3,'Audit B',$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [userA, `a-${suffix}@hee.test`, userB, `b-${suffix}@hee.test`]);
    await client.query(`INSERT INTO "Business" ("id","ownerId","planId","name","slug","businessType","createdAt","updatedAt") VALUES ($1,$2,$3,'Audit A',$4,'audit',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),($5,$6,$3,'Audit B',$7,'audit',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [businessA, userA, planId, `billing-a-${suffix}`, businessB, userB, `billing-b-${suffix}`]);
    await client.query(`INSERT INTO "BillingPaymentMethod" ("id","businessId","provider","encryptedToken","status","createdAt","updatedAt") VALUES ($1,$2,'moyasar','cipher-a','active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),($3,$4,'moyasar','cipher-b','active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [methodA, businessA, methodB, businessB]);
    await client.query(`INSERT INTO "Subscription" ("id","businessId","planId","status","provider","autoRenew","paymentMethodId","startsAt","endsAt","createdAt","updatedAt") VALUES ($1,$2,$3,'active','moyasar',true,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '30 days',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),($5,$6,$3,'replaced','moyasar',false,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '30 days',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, [subscriptionA, businessA, planId, methodA, subscriptionB, businessB, methodB]);

    await mustReject(client, `UPDATE "Subscription" SET "paymentMethodId"='${methodB}' WHERE "id"='${subscriptionA}'`, "23503", "cross-tenant subscription payment method");
    await mustReject(client, `INSERT INTO "BillingPayment" ("id","businessId","planId","subscriptionId","providerGivenId","kind","amount","currency","status","attempt","createdAt","updatedAt") VALUES ('billing-audit-payment-cross-${suffix}','${businessA}','${planId}','${subscriptionB}','${randomUUID()}','renewal',19900,'SAR','created',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, "23503", "cross-tenant renewal subscription");
    await mustReject(client, `INSERT INTO "BillingPayment" ("id","businessId","planId","providerGivenId","kind","amount","currency","status","attempt","createdAt","updatedAt") VALUES ('billing-audit-payment-small-${suffix}','${businessA}','${planId}','${randomUUID()}','initial',99,'SAR','created',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, "23514", "sub-minimum payment amount");
    await mustReject(client, `INSERT INTO "BillingPayment" ("id","businessId","planId","providerGivenId","kind","amount","currency","status","attempt","createdAt","updatedAt") VALUES ('billing-audit-payment-currency-${suffix}','${businessA}','${planId}','${randomUUID()}','initial',19900,'USD','created',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, "23514", "non-SAR payment currency");

    const constraints = await client.query<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conname IN ('Subscription_payment_method_business_fkey','BillingPayment_subscription_business_fkey','BillingPayment_amount_positive','BillingPayment_currency_sar')`);
    assert.deepEqual(new Set(constraints.rows.map((row) => row.conname)), new Set(["Subscription_payment_method_business_fkey", "BillingPayment_subscription_business_fkey", "BillingPayment_amount_positive", "BillingPayment_currency_sar"]));

    await client.query("ROLLBACK");
    console.log("billing-integrity-audit: PASS");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("billing-integrity-audit: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
