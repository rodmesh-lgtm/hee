import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildZatcaInvoice, signZatcaInvoice } from "../app/lib/cashier-zatca-document";
import { onboardZatcaDevice, reportZatcaInvoice, ZatcaGatewayError } from "../app/lib/cashier-zatca-gateway";

const profile = { sellerName: "مؤسسة اختبار للصيانة", sellerAddress: "جدة", vatNumber: "300000000000003" };
const address = { street: "شارع الاختبار", district: "الحي", city: "جدة", building: "1234",
  additionalNumber: "4444", postalCode: "22211", crNumber: "1234567890" };

test("onboarding and reporting use a signed chain and preserve unit precision and credit references", async t => {
  const { computeInvoiceHashFromXml, decodeTLVString } = await import("zatca-sdk");
  const dir = mkdtempSync(join(tmpdir(), "infro-zatca-fixture-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const signingKey = join(dir, "authority.key");
  const csrPath = join(dir, "device.csr");
  const certPath = join(dir, "device.crt");
  execFileSync("openssl", ["ecparam", "-name", "secp256k1", "-genkey", "-noout", "-out", signingKey]);
  let token = "";
  const paths: string[] = [];
  const submissionTypes: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    const path = url.replace("https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation", "");
    paths.push(path);
    const headers = new Headers(init.headers);
    assert.equal(headers.get("Accept-Version"), "V2");
    const body = JSON.parse(String(init.body));
    if (path === "/compliance") {
      assert.equal(headers.get("OTP"), "123456");
      writeFileSync(csrPath, Buffer.from(body.csr, "base64"));
      execFileSync("openssl", ["x509", "-req", "-in", csrPath, "-force_pubkey", exportPublicKey(csrPath, dir),
        "-signkey", signingKey, "-days", "5", "-out", certPath], { stdio: "ignore" });
      token = Buffer.from(readFileSync(certPath, "utf8").replace(/-----[^-]+-----|\s/g, "")).toString("base64");
      return Response.json({ requestID: 321, binarySecurityToken: token, secret: "compliance-secret" });
    }
    assert.equal(headers.get("Authorization"), "Basic " + Buffer.from(`${token}:${path === "/invoices/reporting/single" ? "production-secret" : "compliance-secret"}`).toString("base64"));
    if (path === "/production/csids") {
      assert.deepEqual(body, { compliance_request_id: "321" });
      return Response.json({ requestID: 322, binarySecurityToken: token, secret: "production-secret" });
    }
    const xml = Buffer.from(body.invoice, "base64").toString("utf8");
    assert.deepEqual(computeInvoiceHashFromXml(xml), { success: true, data: body.invoiceHash });
    assert.match(xml, new RegExp(body.uuid));
    assert.match(xml, /<ds:SignatureValue>[^<]+<\/ds:SignatureValue>/);
    const qr = xml.match(/<cbc:ID>QR<\/cbc:ID>[\s\S]*?<cbc:EmbeddedDocumentBinaryObject[^>]*>([^<]+)/)?.[1];
    assert.ok(qr);
    const decoded = decodeTLVString(qr);
    assert.ok(decoded.success);
    assert.equal(decoded.data.invoiceHash, body.invoiceHash);
    assert.match(xml, /<cbc:InvoiceTypeCode name="0200000">(?:381|383|388)/);
    submissionTypes.push(xml.match(/name="0200000">(\d+)/)?.[1] ?? "");
    if (path === "/compliance/invoices") return Response.json({ validationResults: { status: "PASS" } });
    assert.equal(path, "/invoices/reporting/single");
    assert.match(xml, /<cbc:PriceAmount currencyID="SAR">33\.3333333333<\/cbc:PriceAmount>/);
    return Response.json({ reportingStatus: "REPORTED", validationResults: { status: "WARNING", warningMessages: [{}] } });
  });

  const device = await onboardZatcaDevice({ profile, address, deviceId: randomUUID(), industry: "Vehicle maintenance", environment: "simulation", otp: "123456" });
  const issuedAt = new Date();
  const root = { profile, address, issuedAt, gross: 11500, vat: 1500, lines: [{ name: "قماش & خدمة", quantity: 3, gross: 11500, unit: "meter" }] };
  const invoice = buildZatcaInvoice({ ...root, number: 8, counter: 1, previousHash: null });
  const signed = await signZatcaInvoice(invoice, device.credentials);
  const credit = buildZatcaInvoice({ ...root, number: 9, counter: 2, previousHash: signed.hash, correction: { number: 8, reason: "إلغاء الخدمة" } });
  const signedCredit = await signZatcaInvoice(credit, device.credentials);
  assert.match(signedCredit.xml, /<cbc:ID>VAT-000008<\/cbc:ID>/);
  assert.ok(signedCredit.xml.includes(signed.hash));
  assert.match(signed.xml, /قماش &amp; خدمة/);
  assert.equal(await reportZatcaInvoice(signed, device.credentials, "simulation"), "REPORTED_WITH_WARNING");
  assert.deepEqual(paths, ["/compliance", "/compliance/invoices", "/compliance/invoices", "/compliance/invoices", "/production/csids", "/invoices/reporting/single"]);
  assert.deepEqual(submissionTypes, ["388", "381", "383", "388"]);
});

function exportPublicKey(csr: string, dir: string) {
  const path = join(dir, "device.pub");
  const key = execFileSync("openssl", ["req", "-in", csr, "-pubkey", "-noout"]);
  writeFileSync(path, key);
  return path;
}

test("ambiguous reporting result is not treated as accepted", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ reportingStatus: "NOT_REPORTED", validationResults: { status: "PASS" } }));
  await assert.rejects(reportZatcaInvoice({ xml: "<Invoice/>", uuid: randomUUID(), hash: "old" },
    { privateKey: "", binarySecurityToken: "certificate", secret: "secret" }, "simulation"),
  error => error instanceof ZatcaGatewayError && error.code === "REPORT_NOT_CONFIRMED");
});
