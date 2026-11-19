import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import QRCode from "qrcode";
import { cashierTaxQrPayload, cashierVatFromGross, normalizeCashierVatNumber } from "../app/lib/cashier-tax";

test("ZATCA QR carries five UTF-8 fields with VAT-inclusive amounts in SAR", () => {
  const payload = cashierTaxQrPayload({
    sellerName: "مغسلة الأمانة",
    sellerAddress: "جدة، المملكة العربية السعودية",
    vatNumber: "300000000000003",
    issuedAt: "2026-11-18T12:00:00+03:00",
    gross: 11500,
    vat: 1500,
    number: 1,
    originalNumber: null,
  });
  const bytes = Buffer.from(payload, "base64");
  const decoded: Array<[number, string]> = [];
  for (let offset = 0; offset < bytes.length;) {
    const tag = bytes[offset++];
    const length = bytes[offset++];
    decoded.push([tag, bytes.toString("utf8", offset, offset + length)]);
    offset += length;
  }
  assert.deepEqual(decoded, [
    [1, "مغسلة الأمانة"], [2, "300000000000003"], [3, "2026-11-18T09:00:00.000Z"], [4, "115.00"], [5, "15.00"],
  ]);
  assert.ok(QRCode.create(payload).modules.size > 0);
  assert.equal(normalizeCashierVatNumber("٣٠٠٠٠٠٠٠٠٠٠٠٠٠٣"), "300000000000003");
});

test("partial credits reconcile to original output VAT including odd halalas", () => {
  assert.equal(cashierVatFromGross(11500), 1500);
  assert.equal(cashierVatFromGross(10000), 1304);
  let gross = 0, vat = 0;
  for (const amount of [1, 12, 59, 331, 9597]) {
    vat += cashierVatFromGross(gross + amount) - cashierVatFromGross(gross);
    gross += amount;
  }
  assert.equal(gross, 10000);
  assert.equal(vat, 1304);
  assert.throws(() => cashierVatFromGross(-1), RangeError);
});

test("tax documents require their own sale or related credit source and preserve original fiscal data", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`
      CREATE TABLE "Business"(id text PRIMARY KEY);
      CREATE TABLE "LaundryTicket"(id text PRIMARY KEY,"businessId" text,items jsonb,total int,number int,
        "createdAt" timestamptz DEFAULT now(),paid int DEFAULT 0,UNIQUE("businessId",id));
      CREATE TABLE "CashierReturn"(id text PRIMARY KEY,"businessId" text,"ticketId" text,amount int,UNIQUE("businessId",id));
      CREATE FUNCTION cashier_return_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE'; END $$;
      INSERT INTO "Business" VALUES ('a'),('b');
      INSERT INTO "LaundryTicket"(id,"businessId",items,total,number)
      VALUES ('sale-a','a','[]',11500,1),('sale-b','b','[]',11500,1),('other-a','a','[]',11500,2);
      INSERT INTO "CashierReturn" VALUES ('return-a','a','sale-a',2300),('other-return','a','other-a',2300);
    `);
    await pg.exec(await readFile(new URL("../prisma/migrations/20261118110000_cashier_tax_documents/migration.sql", import.meta.url), "utf8"));
    await pg.exec(`INSERT INTO "CashierTaxProfile" ("businessId","sellerName","sellerAddress","vatNumber")
      VALUES ('a','مغسلة الأمانة','عنوان البائع','300000000000003')`);
    assert.deepEqual((await pg.query(`SELECT enabled FROM "CashierTaxProfile" WHERE "businessId"='a'`)).rows, [{ enabled: false }]);
    const insert = (input: unknown[]) => pg.query(`INSERT INTO "CashierTaxDocument"
      ("businessId","ticketId","returnId","number","sellerName","sellerAddress","vatNumber","gross","vat","originalNumber")
      VALUES ($1,$2,$3,$4,$5,'عنوان البائع','300000000000003',$6,$7,$8)`, input);
    await assert.rejects(insert(["a", "sale-b", null, 1, "مغسلة الأمانة", 11500, 1500, null]), /SOURCE_MISMATCH/);
    await insert(["a", "sale-a", null, 1, "مغسلة الأمانة", 11500, 1500, null]);
    await assert.rejects(insert(["a", "sale-a", null, 2, "مغسلة الأمانة", 11500, 1500, null]), /duplicate key/);
    await assert.rejects(insert(["a", "sale-a", "other-return", 2, "مغسلة الأمانة", 2300, 300, 1]), /CREDIT_SOURCE_MISMATCH/);
    await assert.rejects(insert(["a", "sale-a", "return-a", 2, "اسم مغاير", 2300, 300, 1]), /CREDIT_SOURCE_MISMATCH/);
    await insert(["a", "sale-a", "return-a", 2, "مغسلة الأمانة", 2300, 300, 1]);
    await pg.exec(`UPDATE "CashierTaxProfile" SET "sellerName"='اسم جديد' WHERE "businessId"='a';
      UPDATE "LaundryTicket" SET paid=11500 WHERE id='sale-a'`);
    assert.deepEqual((await pg.query(`SELECT "sellerName",vat FROM "CashierTaxDocument" ORDER BY number`)).rows,
      [{ sellerName: "مغسلة الأمانة", vat: 1500 }, { sellerName: "مغسلة الأمانة", vat: 300 }]);
    await assert.rejects(pg.exec(`UPDATE "CashierTaxDocument" SET vat=0 WHERE number=1`), /IMMUTABLE/);
    await assert.rejects(pg.exec(`UPDATE "LaundryTicket" SET total=1 WHERE id='sale-a'`), /INVOICE_SOURCE_IMMUTABLE/);
  } finally {
    await pg.close();
  }
});

test("only definitively rejected B2B attempts can be archived and reissued", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`
      CREATE TABLE "Business"(id text PRIMARY KEY);
      CREATE TABLE "LaundryTicket"(id text PRIMARY KEY,"businessId" text,items jsonb,total int,number int,
        "createdAt" timestamptz DEFAULT now(), UNIQUE("businessId",id));
      CREATE TABLE "CashierReturn"(id text PRIMARY KEY,"businessId" text,"ticketId" text,amount int,UNIQUE("businessId",id));
      CREATE FUNCTION cashier_return_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE'; END $$;
      INSERT INTO "Business" VALUES ('a');
      INSERT INTO "LaundryTicket"(id,"businessId",items,total,number) VALUES ('sale','a','[]',11500,1);
    `);
    for (const migration of ["20261118110000_cashier_tax_documents", "20261118130000_cashier_zatca_phase_two",
      "20261119130000_cashier_zatca_clearance", "20261119165000_cashier_zatca_clearance_reissues"]) {
      await pg.exec(await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), "utf8"));
    }
    await pg.exec(`
      INSERT INTO "CashierTaxDocument" ("businessId","ticketId",number,"sellerName","sellerAddress","vatNumber",gross,vat)
        VALUES ('a','sale',1,'البائع','عنوان البائع','300000000000003',11500,1500);
      INSERT INTO "CashierZatcaDevice" ("businessId",environment,scope,id,seller) VALUES ('a','production','standard','device','{}');
      INSERT INTO "CashierZatcaReport" ("businessId",number,"deviceId",uuid,icv,hash,xml,qr,buyer,status,"resultCode")
        VALUES ('a',1,'device','rejected',1,'hash1','xml1','','{}','review','CLEARANCE_NOT_CONFIRMED');
    `);
    const reissue = `UPDATE "CashierZatcaReport" SET uuid='new',icv=2,hash='hash2',xml='xml2',status='pending',
      "resultCode"=NULL,"reissuedAt"=now() WHERE "businessId"='a' AND number=1`;
    await assert.rejects(pg.exec(reissue), /ARTIFACT_IMMUTABLE/);
    await pg.exec(`UPDATE "CashierZatcaReport" SET "resultCode"='CLEARANCE_REJECTED:BR-10' WHERE number=1`);
    await pg.exec(reissue);
    const archived = await pg.query(`SELECT uuid,"attemptSnapshot"->>'xml' AS xml FROM "CashierZatcaRejectedAttempt"`);
    assert.deepEqual(archived.rows, [{ uuid:"rejected",xml:"xml1" }]);
    await assert.rejects(pg.exec(`DELETE FROM "CashierZatcaRejectedAttempt"`), /IMMUTABLE/);
    await pg.exec(`UPDATE "CashierZatcaReport" SET status='reported',"clearedXml"='stamped',"clearedQr"='qr' WHERE number=1`);
    await assert.rejects(pg.exec(reissue), /ARTIFACT_IMMUTABLE/);
  } finally {
    await pg.close();
  }
});
