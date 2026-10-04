import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { TEMPLATE_MEDIA_CHUNK_BYTES, validateTemplateMedia } from "./template-media-domain";

export type MediaScope = { businessId: string; userId: string; connectionId: string };
export type MediaTicket = { purpose: "template-media"; expires: number; header: string; mime: string; size: number; offset: number; session: string; handle?: string };
function aad(scope: MediaScope) { return Buffer.from(JSON.stringify(["infro-template-media-v1", scope.businessId, scope.userId, scope.connectionId])); }
function key(value: string) { const result = Buffer.from(value, "base64"); if (result.length !== 32) throw new Error("TEMPLATE_MEDIA_KEY_INVALID"); return result; }
export function sealMediaTicket(ticket: MediaTicket, scope: MediaScope, secret: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(secret), iv); cipher.setAAD(aad(scope));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(ticket), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function openMediaTicket(value: string, scope: MediaScope, secret: string, now = Date.now()): MediaTicket {
  if (!value || value.length > 16000) throw new Error("TEMPLATE_MEDIA_TICKET_INVALID");
  const bytes = Buffer.from(value, "base64url"); const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
  decipher.setAAD(aad(scope)); decipher.setAuthTag(bytes.subarray(12, 28));
  const ticket = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString()) as MediaTicket;
  if (ticket.purpose !== "template-media" || !Number.isSafeInteger(ticket.expires) || ticket.expires <= now || !Number.isSafeInteger(ticket.offset) || ticket.offset < 0 || ticket.offset > ticket.size) throw new Error("TEMPLATE_MEDIA_TICKET_INVALID");
  validateTemplateMedia(ticket.header, ticket.mime, ticket.size);
  sessionPath(ticket.session);
  if (ticket.handle !== undefined && (typeof ticket.handle !== "string" || !ticket.handle || ticket.handle.length > 4096 || ticket.offset !== ticket.size)) throw new Error("TEMPLATE_MEDIA_TICKET_INVALID");
  return ticket;
}
export function sessionPath(session: string) {
  if (typeof session !== "string" || session.length > 4096 || !/^upload:[A-Za-z0-9_:=.+/-]+(?:\?sig=[A-Za-z0-9_-]+)?$/.test(session)) throw new Error("TEMPLATE_MEDIA_SESSION_INVALID");
  return session;
}
export function validateMediaChunk(ticket: MediaTicket, bytes: Uint8Array) {
  if (ticket.handle || bytes.length !== Math.min(TEMPLATE_MEDIA_CHUNK_BYTES, ticket.size - ticket.offset) || bytes.length < 1) throw new Error("TEMPLATE_MEDIA_CHUNK_INVALID");
  if (ticket.offset !== 0) return;
  const b = Buffer.from(bytes.subarray(0, 12));
  const valid = ticket.mime === "image/jpeg" ? b[0] === 255 && b[1] === 216 && b[2] === 255 : ticket.mime === "image/png" ? b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : ticket.mime === "application/pdf" ? b.subarray(0, 5).toString() === "%PDF-" : b.subarray(4, 8).toString() === "ftyp";
  if (!valid) throw new Error("TEMPLATE_MEDIA_SIGNATURE_INVALID");
}
export async function uploadTemplateChunk(input: { ticket: MediaTicket; bytes: Uint8Array; url: string; token: string; request?: typeof fetch }) {
  const { ticket, bytes } = input; validateMediaChunk(ticket, bytes);
  const response = await (input.request ?? fetch)(input.url, { method: "POST", redirect: "error", headers: { authorization: `OAuth ${input.token}`, file_offset: String(ticket.offset), "content-type": ticket.mime }, body: Buffer.from(bytes), signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error("TEMPLATE_MEDIA_UPLOAD_FAILED");
  const result = await response.json() as { h?: string };
  const offset = ticket.offset + bytes.length;
  if (offset < ticket.size) {
    // Confirm Meta's persisted offset before allowing the browser to advance.
    const status = await (input.request ?? fetch)(input.url, { method: "GET", redirect: "error", headers: { authorization: `OAuth ${input.token}` }, signal: AbortSignal.timeout(15000) });
    if (!status.ok || Number((await status.json() as { file_offset?: number | string }).file_offset) !== offset) throw new Error("TEMPLATE_MEDIA_OFFSET_UNCONFIRMED");
  }
  if (offset === ticket.size && (typeof result.h !== "string" || !result.h || result.h.length > 4096)) throw new Error("TEMPLATE_MEDIA_INCOMPLETE");
  return { ...ticket, offset, ...(offset === ticket.size ? { handle: result.h } : {}) };
}
