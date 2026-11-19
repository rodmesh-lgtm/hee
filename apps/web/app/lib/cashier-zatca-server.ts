import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { LaundryInputError } from "./laundry-domain";
import { decryptCommerceCredential, encryptCommerceCredential, type CommerceCredentialEnvelope } from "./whatsapp/commerce-credential-envelope";
import { buildZatcaInvoice, prepareStandardZatcaInvoice, signZatcaInvoice, type ZatcaAddress, type ZatcaCredentials, type ZatcaLine, type ZatcaBuyer } from "./cashier-zatca-document";
import { clearZatcaInvoice, reportZatcaInvoice, ZatcaGatewayError } from "./cashier-zatca-gateway";
import type { CashierTaxProfile } from "./cashier-tax";

type Device = { id: string; seller: ZatcaAddress & { vatNumber: string }; credentials: CommerceCredentialEnvelope; expiresAt: Date; counter: number; lastHash: string | null };
type Report = { number: number; businessId: string; deviceId: string; uuid: string; hash: string; xml: string; attempts: number; clearance: boolean };

export function zatcaConfiguration() {
  const encryptionKeyBase64 = process.env.CASHIER_ZATCA_ENCRYPTION_KEY ?? "";
  return { encryptionKeyBase64,
    configured: /^[A-Za-z0-9+/]{43}=$/.test(encryptionKeyBase64) && Buffer.from(encryptionKeyBase64, "base64").length === 32,
    production: process.env.CASHIER_ZATCA_PRODUCTION_ENABLED === "true",
  };
}

export function sealZatcaCredentials(businessId: string, deviceId: string, credentials: ZatcaCredentials) {
  return encryptCommerceCredential({ businessId, integrationId: deviceId, provider: "zatca", keyVersion: "1",
    encryptionKeyBase64: zatcaConfiguration().encryptionKeyBase64, plaintext: JSON.stringify(credentials),
  });
}

function openZatcaCredentials(businessId: string, deviceId: string, envelope: CommerceCredentialEnvelope): ZatcaCredentials {
  return JSON.parse(decryptCommerceCredential({ businessId, integrationId: deviceId, provider: "zatca", envelope,
    encryptionKeyBase64: zatcaConfiguration().encryptionKeyBase64,
  })) as ZatcaCredentials;
}

/** The caller holds the existing per-business accounting lock. */
export async function attachZatcaArtifact(tx: Prisma.TransactionClient, input: {
  businessId: string; number: number; issuedAt: Date; seller: Omit<CashierTaxProfile, "enabled">;
  gross: number; vat: number; lines: ZatcaLine[]; method?: string;
  credit?: { number: number; reason: string };
  buyer?: ZatcaBuyer;
  supplyDate?: string;
}) {
  const { businessId, credit } = input;
  const [original] = credit ? await tx.$queryRaw<Array<{ number: number; deviceId: string | null; buyer: ZatcaBuyer | null; status: string | null }>>`
    SELECT d.number,r."deviceId",r.buyer,r.status FROM "CashierTaxDocument" d LEFT JOIN "CashierZatcaReport" r
    ON (r."businessId",r.number)=(d."businessId",d.number)
    WHERE d."businessId"=${businessId} AND d.number=${credit.number}` : [];
  if (original?.buyer && original.status !== "reported") throw new LaundryInputError("اعتمد الفاتورة الأصلية لدى زاتكا قبل إنشاء الإشعار الدائن.");
  const buyer = original?.buyer ?? input.buyer;
  const target = original?.deviceId ? Prisma.sql`id=${original.deviceId}` : Prisma.sql`active=TRUE AND scope=${buyer ? "standard" : "simplified"}`;
  const [device] = await tx.$queryRaw<Device[]>`
    SELECT id,seller,credentials,"expiresAt",counter,"lastHash" FROM "CashierZatcaDevice" WHERE "businessId"=${businessId}
    AND environment='production' AND ${target} FOR UPDATE`;
  if (!device) {
    if (original?.deviceId || buyer) throw new LaundryInputError("جهاز زاتكا المرتبط بنوع الفاتورة غير متاح.");
    if (!credit) {
      const [standard] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "CashierZatcaDevice"
        WHERE "businessId"=${businessId} AND environment='production' AND scope='standard' AND active=TRUE`;
      if (standard) throw new LaundryInputError("فعّل جهاز فواتير الأفراد قبل إصدار فاتورة مبسطة.");
    }
    return;
  }

  if (device.seller.vatNumber !== input.seller.vatNumber) throw new LaundryInputError("الرقم الضريبي للمستند يختلف عن الرقم المسجّل لجهاز الإصدار.");
  if (device.expiresAt <= input.issuedAt) throw new LaundryInputError("انتهت شهادة جهاز زاتكا. راجع مالك المنشأة لتجديدها.");
  let artifact;
  try {
    const document = buildZatcaInvoice({ ...input, buyer, profile: input.seller, address: device.seller,
      counter: device.counter + 1, previousHash: device.lastHash,
      correction: original && credit ? { ...original, reason: credit.reason } : undefined,
    });
    artifact = buyer ? await prepareStandardZatcaInvoice(document)
      : await signZatcaInvoice(document, openZatcaCredentials(businessId, device.id, device.credentials));
  } catch {
    throw new LaundryInputError("تعذر توقيع مستند زاتكا. راجع إعدادات الربط قبل إصدار المستند.");
  }
  await tx.$executeRaw`INSERT INTO "CashierZatcaReport"
    ("businessId",number,"deviceId",uuid,icv,hash,xml,qr,buyer)
    VALUES (${businessId},${input.number},${device.id},${artifact.uuid},${device.counter + 1},${artifact.hash},${artifact.xml},${artifact.qr},${buyer ? JSON.stringify(buyer) : null}::jsonb)`;
  await tx.$executeRaw`UPDATE "CashierZatcaDevice" SET counter=counter+1,"lastHash"=${artifact.hash}
    WHERE "businessId"=${businessId} AND id=${device.id}`;
}

export async function runCashierZatcaReports() {
  if (!zatcaConfiguration().configured) return { claimed: 0 };
  const lease = randomUUID();
  const reports = await db.$queryRaw<Report[]>`
    WITH due AS (
      SELECT "businessId",number FROM "CashierZatcaReport"
      WHERE status='pending' AND "availableAt" <= now()
      ORDER BY "availableAt",icv LIMIT 8 FOR UPDATE SKIP LOCKED
    )
    UPDATE "CashierZatcaReport" r SET "availableAt"=now()+interval '2 minutes', "leaseToken"=${lease}, attempts=attempts+1
    FROM due WHERE (r."businessId",r.number)=(due."businessId",due.number)
    RETURNING r."businessId",r.number,r."deviceId",r.uuid,r.hash,r.xml,r.attempts,r.buyer IS NOT NULL AS clearance`;

  await Promise.all(reports.map(async report => {
    let status = "pending", code = "DEVICE_UNAVAILABLE";
    let cleared: Awaited<ReturnType<typeof clearZatcaInvoice>> | null = null;
    try {
      const [device] = await db.$queryRaw<Pick<Device, "credentials">[]>`SELECT credentials FROM "CashierZatcaDevice"
        WHERE "businessId"=${report.businessId} AND id=${report.deviceId} AND environment='production'`;
      if (!device) throw new ZatcaGatewayError("DEVICE_UNAVAILABLE");
      const credentials = openZatcaCredentials(report.businessId, report.deviceId, device.credentials);
      if (report.clearance) {
        cleared = await clearZatcaInvoice(report, credentials);
        code = cleared.code;
      } else {
        code = await reportZatcaInvoice(report, credentials);
      }
      status = "reported";
    } catch (error) {
      if (error instanceof ZatcaGatewayError) {
        code = error.code;
        if ((error.status >= 400 && error.status < 500 && ![401, 403, 408, 429].includes(error.status)) ||
            ["REPORT_NOT_CONFIRMED","CLEARANCE_NOT_CONFIRMED","CLEARANCE_DOCUMENT_INVALID"].includes(error.code)) status = "review";
      } else {
        code = "DEVICE_CREDENTIAL_ERROR";
      }
    }
    const wait = Math.min(900, 30 * 2 ** Math.min(6, report.attempts));
    await db.$executeRaw`UPDATE "CashierZatcaReport" SET status=${status},"resultCode"=${code},"leaseToken"=NULL,
      "clearedXml"=${cleared?.xml ?? null},"clearedQr"=${cleared?.qr ?? null},
      "availableAt"=now()+${wait}*interval '1 second', "reportedAt"=CASE WHEN ${status}='reported' THEN now() ELSE NULL END
      WHERE "businessId"=${report.businessId} AND number=${report.number} AND "leaseToken"=${lease}`;
  }));
  return { claimed: reports.length };
}
