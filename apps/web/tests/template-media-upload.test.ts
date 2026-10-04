import test from "node:test";
import assert from "node:assert/strict";
import { TEMPLATE_MEDIA_CHUNK_BYTES, templateMediaLimit, validateTemplateMedia } from "../app/lib/whatsapp/template-media-domain";
import { openMediaTicket, sealMediaTicket, uploadTemplateChunk, validateMediaChunk, type MediaTicket } from "../app/lib/whatsapp/template-media-upload";
const scope = { businessId: "tenant-a", userId: "user-a", connectionId: "connection-a" };
const secret = Buffer.alloc(32, 42).toString("base64");
const ticket: MediaTicket = { purpose: "template-media", expires: 10000, header: "VIDEO", mime: "video/mp4", size: 5 * 1024 * 1024, offset: 0, session: "upload:sample?sig=test" };

test("media limits accept files beyond 3 MB but enforce each supported type", () => {
  validateTemplateMedia("VIDEO", "video/mp4", 16 * 1024 * 1024);
  validateTemplateMedia("IMAGE", "image/png", 5 * 1024 * 1024);
  validateTemplateMedia("DOCUMENT", "application/pdf", 100 * 1024 * 1024);
  assert.equal(templateMediaLimit("__proto__"), 0);
  for (const [header, mime, size] of [["VIDEO", "video/mp4", 16 * 1024 * 1024 + 1], ["IMAGE", "video/mp4", 100], ["DOCUMENT", "text/html", 100], ["NONE", "image/png", 100]] as const) assert.throws(() => validateTemplateMedia(header, mime, size));
});
test("upload tickets reject other tenants, users, connections, tampering and expiration", () => {
  const sealed = sealMediaTicket(ticket, scope, secret);
  assert.deepEqual(openMediaTicket(sealed, scope, secret, 9999), ticket);
  for (const other of [{ ...scope, businessId: "tenant-b" }, { ...scope, userId: "user-b" }, { ...scope, connectionId: "connection-b" }]) assert.throws(() => openMediaTicket(sealed, other, secret, 9999));
  assert.throws(() => openMediaTicket(sealed, scope, secret, 10000));
  const damaged = Buffer.from(sealed, "base64url"); damaged[30] ^= 1;
  assert.throws(() => openMediaTicket(damaged.toString("base64url"), scope, secret, 1));
});
test("first chunk validates file bytes and rejects oversized, short and completed chunks", () => {
  const bytes = Buffer.alloc(TEMPLATE_MEDIA_CHUNK_BYTES); bytes.write("ftyp", 4);
  validateMediaChunk(ticket, bytes);
  assert.throws(() => validateMediaChunk(ticket, Buffer.alloc(TEMPLATE_MEDIA_CHUNK_BYTES)));
  assert.throws(() => validateMediaChunk(ticket, bytes.subarray(0, 500)));
  assert.throws(() => validateMediaChunk({ ...ticket, handle: "done" }, bytes));
});
test("5 MB sample travels in bounded requests with exact offsets and final receipt", async () => {
  let current = ticket; const offsets: number[] = []; let persistedOffset = 0;
  const request: typeof fetch = async (_url, init) => {
    if (init?.method === "GET") return Response.json({ file_offset: persistedOffset });
    const offset = Number((init?.headers as Record<string,string>).file_offset); offsets.push(offset);
    const body = init?.body as Buffer;
    assert.ok(body.length <= TEMPLATE_MEDIA_CHUNK_BYTES);
    assert.equal(init?.redirect, "error");
    persistedOffset = offset + body.length;
    return Response.json(offset + body.length === ticket.size ? { h: "final-review-handle" } : { id: "upload:sample" });
  };
  while (current.offset < current.size) {
    const bytes = Buffer.alloc(Math.min(TEMPLATE_MEDIA_CHUNK_BYTES, current.size - current.offset));
    if (!current.offset) bytes.write("ftyp", 4);
    current = await uploadTemplateChunk({ ticket: current, bytes, url: "https://graph.facebook.com/v23.0/upload:sample", token: "test-only", request });
  }
  assert.deepEqual(offsets, [0, 2097152, 4194304]);
  assert.equal(current.handle, "final-review-handle");
  assert.equal(current.offset, current.size);
});
test("a partial upload cannot advance without Meta confirming its offset", async () => {
  const bytes = Buffer.alloc(TEMPLATE_MEDIA_CHUNK_BYTES); bytes.write("ftyp", 4);
  await assert.rejects(uploadTemplateChunk({ ticket, bytes, url: "https://graph.facebook.com/upload:sample", token: "test-only", request: async (_url, init) => Response.json(init?.method === "GET" ? { file_offset: 0 } : {}) }), /OFFSET_UNCONFIRMED/);
});
test("provider failures and missing final handle never produce a completed receipt", async () => {
  const last = { ...ticket, offset: 4 * 1024 * 1024 }; const bytes = Buffer.alloc(1024 * 1024);
  for (const response of [new Response("failed", { status: 500 }), Response.json({})]) {
    await assert.rejects(uploadTemplateChunk({ ticket: last, bytes, url: "https://graph.facebook.com/upload:sample", token: "test-only", request: async () => response }));
  }
});
