import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export function normalizeAccountPhone(raw: string) {
  let value = raw.trim().replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[\s()-]/g, "");
  if (!value) return null;
  if (/^05\d{8}$/.test(value)) value = `966${value.slice(1)}`;
  value = value.replace(/^00/, "").replace(/^\+/, "");
  if (!/^[1-9]\d{7,14}$/.test(value)) throw new Error("invalid-phone");
  if (value.startsWith("966") && !/^9665\d{8}$/.test(value)) throw new Error("invalid-phone");
  return `+${value}`;
}

export function accountCodeHash(requestId: string, channel: "current" | "new", code: string) {
  return createHash("sha256").update(`${requestId}:${channel}:${code}`).digest("hex");
}

export function createAccountCode() { return String(randomInt(0, 1_000_000)).padStart(6, "0"); }

export function accountCodeMatches(requestId: string, channel: "current" | "new", code: string, expected: string) {
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(accountCodeHash(requestId, channel, code), "hex"), Buffer.from(expected, "hex"));
}
