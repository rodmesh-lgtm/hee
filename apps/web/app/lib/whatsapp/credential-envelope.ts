import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENVELOPE_VERSION = 1 as const;
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

type CredentialEnvelopeV1 = {
  v: typeof ENVELOPE_VERSION;
  alg: typeof ALGORITHM;
  keyVersion: string;
  iv: string;
  ciphertext: string;
  tag: string;
};

export type WhatsAppCredentialEnvelope = CredentialEnvelopeV1;

function decodeKey(encoded: string) {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("META_WHATSAPP_CREDENTIAL_KEY_INVALID");
  return key;
}

export function encryptWhatsAppCredential(input: {
  plaintext: string;
  encryptionKeyBase64: string;
  keyVersion: string;
  businessId: string;
}) {
  if (!input.plaintext) throw new Error("META_WHATSAPP_CREDENTIAL_EMPTY");
  if (!input.keyVersion.trim() || !input.businessId.trim()) throw new Error("META_WHATSAPP_CREDENTIAL_CONTEXT_INVALID");

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, decodeKey(input.encryptionKeyBase64), iv);
  cipher.setAAD(Buffer.from(`ir:whatsapp:${input.businessId}:${input.keyVersion}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(input.plaintext, "utf8"), cipher.final()]);

  const envelope: CredentialEnvelopeV1 = {
    v: ENVELOPE_VERSION,
    alg: ALGORITHM,
    keyVersion: input.keyVersion,
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
  return envelope;
}

export function decryptWhatsAppCredential(input: {
  envelope: WhatsAppCredentialEnvelope;
  encryptionKeyBase64: string;
  businessId: string;
}) {
  const { envelope } = input;
  if (envelope.v !== ENVELOPE_VERSION || envelope.alg !== ALGORITHM) {
    throw new Error("META_WHATSAPP_CREDENTIAL_ENVELOPE_UNSUPPORTED");
  }
  const decipher = createDecipheriv(ALGORITHM, decodeKey(input.encryptionKeyBase64), Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from(`ir:whatsapp:${input.businessId}:${envelope.keyVersion}`, "utf8"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
