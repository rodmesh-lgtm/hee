import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { ACCOUNTING_SECURITY_HOLD } from "../app/lib/accounting-security";
import { accountingProvenanceQuery, accountingProvenanceFindings, type AccountingProvenance } from "../app/lib/accounting-provenance-query";
import { Prisma } from "@prisma/client";
import * as noticeDomain from "../app/lib/whatsapp/cashier-notice-domain";


async function load(file: string, dependencies: Record<string, unknown>) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(code, { exports, require: (id: string) => dependencies[id] ?? {}, Date, Error });
  return exports;
}

test("incident hold blocks every financial section before database or subscription reads", async () => {
  assert.equal(typeof ACCOUNTING_SECURITY_HOLD, "boolean");
  let reads = 0;
  const active = await load("../app/lib/active-business.ts", {
    "./accounting-security": { ACCOUNTING_SECURITY_HOLD:true },
    "next/headers": { cookies: async () => { reads++; throw Error("must not resolve tenant"); } },
    "./db": { db: {} },
    "./commercial-access": { commercialAccess: async () => { reads++; } },
  });
  const resolve = active.getActiveBusinessForUser as (id: string, section: string) => Promise<unknown>;
  for (const section of ["laundry", "laundryAccounting", "laundryOperations", "laundryDelivery"]) {
    assert.equal(await resolve("owner", section), null);
  }
  assert.equal(reads, 0);
});

test("scheduled and queued invoice notices both fail the final pre-send query during a hold", async () => {
  const deps={"../accounting-security":{ACCOUNTING_SECURITY_HOLD:true},"@prisma/client":{Prisma},"./cashier-notice-domain":noticeDomain};
  const {readyNoticeQuery}=await load("../app/lib/whatsapp/ready-notice-query.ts",deps) as typeof import("../app/lib/whatsapp/ready-notice-query");
  const {cashierNoticeTicketsQuery}=await load("../app/lib/whatsapp/cashier-notice-query.ts",deps) as typeof import("../app/lib/whatsapp/cashier-notice-query");
  const queries = [
    readyNoticeQuery("tenant-a", "ticket", "+966500000000", new Date()),
    cashierNoticeTicketsQuery({ businessId: "tenant-a", trigger: "cashier_payment_reminder", activatedAt: new Date(), now: new Date() }),
  ];
  for (const query of queries) {
    assert.match(query.text, /WHERE \$\d+ AND t\./);
    assert.equal(query.values.includes(false), true);
  }
});

test("all invoice workspace entry points stop before private reads and admin diagnostics require admin first", async () => {
  for (const file of ["../app/Accounting/page.tsx", "../app/Laundromat/server-workspace.tsx", "../app/Laundromat/layout.tsx"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /if \(ACCOUNTING_SECURITY_HOLD\) return <AccountingSecurityNotice/);
  }
  const admin = await readFile(new URL("../app/admin/accounting-security/page.tsx", import.meta.url), "utf8");
  assert.ok(admin.indexOf("await requireAdmin()") < admin.indexOf("db.business.findMany"));
  assert.doesNotMatch(admin, /\$executeRaw|business\.update|customerName|\.phone/);
});

test("provenance query identifies foreign customer, service, payment and audit references without returning PII", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`
      CREATE TABLE "Business" (id text, "ownerId" text);
      CREATE TABLE "BusinessMember" ("businessId" text, "userId" text, status text);
      CREATE TABLE "LaundryTicket" (id text, number int, "businessId" text, "createdBy" text, "createdAt" timestamptz, "customerId" text, items jsonb, phone text, "customerName" text);
      CREATE TABLE "LaundryAudit" ("businessId" text, "targetId" text, "actorId" text, action text);
      CREATE TABLE "LaundryCustomer" (id text, "businessId" text);
      CREATE TABLE "LaundryService" (id text, "businessId" text);
      CREATE TABLE "LaundryPayment" ("ticketId" text, "businessId" text);
      INSERT INTO "Business" VALUES ('a','owner-a'),('b','owner-b');
      INSERT INTO "LaundryCustomer" VALUES ('ca','a'),('cb','b');
      INSERT INTO "LaundryService" VALUES ('sa','a'),('sb','b');
      INSERT INTO "LaundryTicket" VALUES
        ('clean',1,'a','owner-a',now(),'ca','[{"serviceId":"sa"}]','private-a','private-a'),
        ('suspect',2,'a','owner-b',now(),'cb','[{"serviceId":"sb"}]','private-suspect','private-suspect'),
        ('other',1,'b','owner-b',now(),'cb','[{"serviceId":"sb"}]','private-b','private-b');
      INSERT INTO "LaundryAudit" VALUES ('a','clean','owner-a','order'),('b','suspect','owner-b','order');
      INSERT INTO "LaundryPayment" VALUES ('suspect','b');
    `);
    const query = accountingProvenanceQuery("a");
    const result = await pg.query<AccountingProvenance>(query.text, query.values);
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows.some(row => row.id === "other"), false);
    const clean = result.rows.find(row => row.id === "clean")!;
    const suspect = result.rows.find(row => row.id === "suspect")!;
    assert.equal(accountingProvenanceFindings(clean).length, 0);
    assert.equal(accountingProvenanceFindings(suspect).length, 6);
    assert.doesNotMatch(JSON.stringify(result.rows), /private-|customerName|phone|unitPrice/);
    const injection = accountingProvenanceQuery("a' OR true --");
    assert.equal((await pg.query(injection.text, injection.values)).rows.length, 0);
    assert.equal((await pg.query<{n:number}>('SELECT count(*)::int AS n FROM "LaundryTicket"')).rows[0].n, 3);
  } finally { await pg.close(); }
});


test("private business resolvers never fall back after an inaccessible explicit selection", async () => {
  let reads = 0;
  const active = await load("../app/lib/active-business.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "foreign-tenant" }) }) },
    "./db": { db: { business: { findFirst: async () => { reads++; return null; } } } },
  });
  for (const name of ["getActiveBusinessForUser", "getActiveBusinessWithPlanForUser", "getDashboardBusinessForUser"]) {
    reads = 0;
    const resolve = active[name] as (id: string) => Promise<unknown>;
    assert.equal(await resolve("owner"), null);
    assert.equal(reads, 1);
  }
});
