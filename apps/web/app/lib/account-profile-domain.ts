import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export { normalizeAccountPhone } from "./account-phone";

export function accountCodeHash(requestId: string, channel: "current" | "new", code: string) {
  return createHash("sha256").update(`${requestId}:${channel}:${code}`).digest("hex");
}

export function createAccountCode() { return String(randomInt(0, 1_000_000)).padStart(6, "0"); }

export function accountCodeMatches(requestId: string, channel: "current" | "new", code: string, expected: string) {
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(accountCodeHash(requestId, channel, code), "hex"), Buffer.from(expected, "hex"));
}
