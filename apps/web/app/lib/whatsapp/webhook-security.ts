import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function verifyMetaWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string;
}) {
  const signature = input.signatureHeader?.trim() ?? "";
  if (!signature.startsWith(SIGNATURE_PREFIX) || !input.appSecret) return false;

  const suppliedHex = signature.slice(SIGNATURE_PREFIX.length);
  if (!/^[a-fA-F0-9]{64}$/.test(suppliedHex)) return false;

  const expected = createHmac("sha256", input.appSecret).update(input.rawBody, "utf8").digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function verifyMetaWebhookChallenge(input: {
  mode: string | null;
  verifyToken: string | null;
  expectedVerifyToken: string;
}) {
  if (input.mode !== "subscribe" || !input.verifyToken || !input.expectedVerifyToken) return false;
  const supplied = Buffer.from(input.verifyToken, "utf8");
  const expected = Buffer.from(input.expectedVerifyToken, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
