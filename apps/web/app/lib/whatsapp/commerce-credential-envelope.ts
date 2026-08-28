import "server-only";

import { createCipheriv, randomBytes } from "node:crypto";

export type CommerceCredentialEnvelope = {
  v: 1;
  alg: "aes-256-gcm";
  keyVersion: string;
  iv: string;
  ciphertext: string;
  tag: string;
};

export function encryptCommerceCredential(input: {
  plaintext: string;
  encryptionKeyBase64: string;
  keyVersion: string;
  businessId: string;
  integrationId: string;
  provider: string;
}) {
  const key = Buffer.from(input.encryptionKeyBase64, "base64");
  if (key.length !== 32) throw new Error("COMMERCE_CREDENTIAL_KEY_INVALID");
  if (!input.plaintext || !input.businessId || !input.integrationId || !input.provider || !input.keyVersion) throw new Error("COMMERCE_CREDENTIAL_CONTEXT_INVALID");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`ir:whatsapp-commerce:${input.businessId}:${input.integrationId}:${input.provider}:${input.keyVersion}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(input.plaintext, "utf8"), cipher.final()]);
  return {
    v: 1, alg: "aes-256-gcm", keyVersion: input.keyVersion,
    iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"), tag: cipher.getAuthTag().toString("base64"),
  } satisfies CommerceCredentialEnvelope;
}
