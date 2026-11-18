import { z } from "zod";
import { buildZatcaInvoice, signZatcaInvoice, zatcaSigningCertificate, type ZatcaAddress, type ZatcaCredentials } from "./cashier-zatca-document";
import type { CashierTaxProfile } from "./cashier-tax";

export type ZatcaEnvironment = "simulation" | "production";
const gatewayPaths = { simulation: "simulation", production: "core" } as const;
const certificate = z.object({
  requestID: z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]),
  binarySecurityToken: z.string().min(16).max(16_384), secret: z.string().min(1).max(2048),
});
const validation = z.object({
  status: z.enum(["PASS", "WARNING", "ERROR"]),
  warningMessages: z.array(z.unknown()).optional(),
  errorMessages: z.array(z.object({ code: z.string().nullish() })).optional(),
});
export class ZatcaGatewayError extends Error {
  constructor(readonly code: string, readonly status: number = 0) { super(code); }
}

async function gatewayRequest(input: {
  environment: ZatcaEnvironment;
  path: "/compliance" | "/compliance/invoices" | "/production/csids" | "/invoices/reporting/single";
  body: object;
  auth?: Pick<ZatcaCredentials, "binarySecurityToken" | "secret">;
  otp?: string;
}) {
  const headers: Record<string, string> = {
    Accept: "application/json", "Content-Type": "application/json", "Accept-Version": "V2", "Accept-Language": "ar",
  };
  if (input.auth) headers.Authorization = "Basic " + Buffer.from(`${input.auth.binarySecurityToken}:${input.auth.secret}`).toString("base64");
  if (input.otp) headers.OTP = input.otp;
  if (input.path === "/invoices/reporting/single") headers["Clearance-Status"] = "0";
  let response: Response;
  try {
    response = await fetch(`https://gw-fatoora.zatca.gov.sa/e-invoicing/${gatewayPaths[input.environment]}${input.path}`, {
      method: "POST", headers, body: JSON.stringify(input.body), cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ZatcaGatewayError("NETWORK");
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z.object({ validationResults: validation }).safeParse(payload);
    const code = parsed.success ? zatcaValidationCode(parsed.data.validationResults) : "";
    throw new ZatcaGatewayError(`HTTP_${response.status}${code}`, response.status);
  }
  if (payload === null) throw new ZatcaGatewayError("INVALID_RESPONSE", response.status);
  return payload;
}

function zatcaValidationCode(result: z.infer<typeof validation>) {
  const code = result.errorMessages?.find(message => /^[A-Za-z0-9_.-]{2,48}$/.test(message.code ?? ""))?.code;
  return code ? `:${code}` : "";
}

function requestBody(artifact: { xml: string; uuid: string; hash: string }) {
  return { invoice: Buffer.from(artifact.xml, "utf8").toString("base64"), uuid: artifact.uuid, invoiceHash: artifact.hash };
}

export async function onboardZatcaDevice(input: {
  environment: ZatcaEnvironment;
  otp: string;
  deviceId: string;
  industry: string;
  address: ZatcaAddress;
  profile: Omit<CashierTaxProfile, "enabled">;
}) {
  const { environment, address, profile, deviceId } = input;
  const { EGS } = await import("zatca-sdk");
  const device = new EGS({
    uuid: deviceId, branchName: address.city, branchIndustry: input.industry, model: "Cashier",
    location: `${address.building} ${address.street} ${address.city} ${address.postalCode}`,
    commonName: `INFRO-${profile.vatNumber}-${deviceId.slice(0, 8)}`,
    organizationName: profile.sellerName, countryCode: "SA", vatNumber: profile.vatNumber, invoiceType: "0100",
  }, environment);
  const keys = device.generateKeysAndCSR("INFRO");
  if (!keys.success) throw new ZatcaGatewayError("CSR_INVALID");
  const { csr, privateKey } = keys.data;
  const compliance = certificate.parse(await gatewayRequest({
    environment, path: "/compliance", body: { csr }, otp: input.otp,
  }));
  const credentials = { ...compliance, privateKey };
  const issuedAt = new Date();
  let previousHash: string | null = null;
  let original: { number: number } | undefined;
  for (const number of [1, 2, 3]) {
    const document = buildZatcaInvoice({
      profile, address, number, counter: number, previousHash, issuedAt,
      gross: 11500, vat: 1500, lines: [{ name: "خدمة اختبار الربط", quantity: 1, gross: 11500 }],
      correction: original ? { ...original, reason: "اختبار توافق جهاز الإصدار", debit: number === 3 } : undefined,
    });
    const signed = await signZatcaInvoice(document, credentials);
    const result = z.object({ validationResults: validation }).parse(await gatewayRequest({
      environment, path: "/compliance/invoices", auth: compliance, body: requestBody(signed),
    }));
    if (result.validationResults.status === "ERROR") throw new ZatcaGatewayError(`COMPLIANCE_REJECTED${zatcaValidationCode(result.validationResults)}`);
    original ??= { number };
    previousHash = signed.hash;
  }
  const production = certificate.parse(await gatewayRequest({
    environment, path: "/production/csids", auth: compliance, body: { compliance_request_id: String(compliance.requestID) },
  }));
  const result = { privateKey, binarySecurityToken: production.binarySecurityToken, secret: production.secret };
  return { credentials: result, expiresAt: (await zatcaSigningCertificate(result)).expiresAt };
}

export async function reportZatcaInvoice(
  artifact: { xml: string; uuid: string; hash: string },
  credentials: ZatcaCredentials,
  environment: ZatcaEnvironment = "production",
) {
  const response = z.object({
    reportingStatus: z.literal("REPORTED"),
    validationResults: validation,
  }).safeParse(await gatewayRequest({
    environment, path: "/invoices/reporting/single", body: requestBody(artifact), auth: credentials,
  }));
  if (!response.success || response.data.validationResults.status === "ERROR") throw new ZatcaGatewayError("REPORT_NOT_CONFIRMED", 200);
  return response.data.validationResults.status === "WARNING" || response.data.validationResults.warningMessages?.length
    ? "REPORTED_WITH_WARNING" : "REPORTED";
}
