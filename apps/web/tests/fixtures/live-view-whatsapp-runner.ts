import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { MetaWhatsAppConfig } from "../../app/lib/whatsapp/meta-config";
import { encryptWhatsAppCredential } from "../../app/lib/whatsapp/credential-envelope";
import { sendLiveViewWhatsApp } from "../../app/lib/live-view/whatsapp";
import { LIVE_VIEW_TEMPLATE_BODY, LIVE_VIEW_TEMPLATE_NAME, liveViewTemplateSupported, liveViewWatchCapability } from "../../app/lib/live-view/whatsapp-domain";

const watchPath = `/watch/${"a".repeat(43)}`;
const key = Buffer.alloc(32, 3).toString("base64");
const template = { name: LIVE_VIEW_TEMPLATE_NAME, parameterFormat: "POSITIONAL", components: [{ type: "BODY", text: LIVE_VIEW_TEMPLATE_BODY }] };
test("only the dedicated approved body shape can receive the private viewing capability", () => {
  assert.equal(liveViewTemplateSupported(template), true);
  for (const bad of [{ ...template, name: "unrelated" }, { ...template, parameterFormat: "NAMED" }, { ...template, components: [...template.components, { type: "BUTTONS", text: "{{1}}" }] }, { ...template, components: [{ type: "BODY", text: "{{1}} {{2}} {{3}} {{4}}" }] }]) assert.equal(liveViewTemplateSupported(bad), false);
  assert.equal(liveViewWatchCapability(watchPath).url, `https://hub.ir.sa${watchPath}`);
  for (const path of ["https://evil.test/watch/" + "a".repeat(43), watchPath + "?x=1", "/watch/../secret", "//evil.test"]) assert.throws(() => liveViewWatchCapability(path));
});

function fixture(options: { noSession?: boolean; optedOut?: boolean; noTemplate?: boolean; noRate?: boolean; disconnected?: boolean; closedBeforeSend?: boolean } = {}) {
  const receipts: Array<{ id: string; targetId: string; outcome: string; metadata: unknown }> = [];
  const stored: unknown[] = [], requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const input = { businessId: "business-1", actorUserId: "owner", sessionId: "session-1", watchPath, phone: "0501234567", consent: true };
  const session = { id: input.sessionId, customerName: "أحمد", reference: "1024", business: { name: "المنشأة" }, station: { connectorId: options.disconnected ? "connector" : null, connector: null } };
  let sessionReads = 0;
  const database = {
    $transaction: async (callback: (tx: unknown) => unknown) => callback(database),
    $executeRaw: async () => 1,
    $queryRaw: async () => options.noRate ? [] : [{ sentCount: 1 }],
    liveViewSession: { findFirst: async ({ where }: { where: { businessId: string; tokenHash: string } }) => {
      sessionReads++;
      if (options.noSession || (options.closedBeforeSend && sessionReads > 1) || where.businessId !== "business-1" || where.tokenHash !== liveViewWatchCapability(watchPath).hash) return null;
      return session;
    } },
    whatsAppContact: { findUnique: async () => options.optedOut ? { optedOutAt: new Date(), deletedAt: null } : null },
    whatsAppTemplate: { findFirst: async ({ where }: { where: { businessId: string } }) => options.noTemplate || where.businessId !== "business-1" ? null : ({ ...template, id: "template-1", connectionId: "connection-1", language: "ar", connection: { phoneNumberId: "123456", credentialEnvelope: encryptWhatsAppCredential({ plaintext: "tenant-access-token", encryptionKeyBase64: key, keyVersion: "v1", businessId: "business-1" }) } }) },
    whatsAppAuditLog: {
      findFirst: async () => [...receipts].reverse().find(r => ["processing", "accepted", "unknown"].includes(r.outcome)) ?? null,
      create: async ({ data }: { data: typeof receipts[number] }) => { const row = { ...data, id: "receipt-1" }; receipts.push(row); return row; },
      update: async ({ data }: { data: Partial<typeof receipts[number]> }) => Object.assign(receipts[0], data),
    },
    whatsAppConversation: { upsert: async ({ create }: { create: unknown }) => { stored.push(create); return { id: "conversation-1" }; } },
    whatsAppMessage: { create: async ({ data }: { data: unknown }) => { stored.push(data); return data; } },
  };
  const deps = { database: database as unknown as PrismaClient, env: { NODE_ENV: "test" as const, WHATSAPP_OUTBOUND_ENABLED: "true" }, entitled: async () => true, config: { META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY: key, META_WHATSAPP_GRAPH_VERSION: "v23.0" } as MetaWhatsAppConfig,
    fetcher: (async (url, init) => { requests.push({ url: String(url), body: JSON.parse(String(init?.body)) }); return Response.json({ messages: [{ id: "wamid.test" }] }); }) as typeof fetch };
  return { input, deps, receipts, stored, requests };
}

test("one tenant sender, normalized recipient, hidden bearer in storage and durable duplicate suppression", async () => {
  const f = fixture();
  assert.equal((await sendLiveViewWhatsApp(f.input, f.deps)).status, "accepted");
  assert.equal((await sendLiveViewWhatsApp({ ...f.input, phone: "0509999999" }, f.deps)).status, "already_accepted");
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].url, "https://graph.facebook.com/v23.0/123456/messages");
  assert.equal(f.requests[0].body.to, "+966501234567");
  assert.ok(JSON.stringify(f.requests[0].body).includes(`https://hub.ir.sa${watchPath}`));
  assert.ok(!JSON.stringify([f.stored, f.receipts]).includes(watchPath.slice(7)));
});

test("missing consent, entitlement, tenant scope, old token, opt-out, offline source and expiry block sending", async () => {
  for (const options of [{ noSession: true }, { optedOut: true }, { noTemplate: true }, { noRate: true }, { disconnected: true }, { closedBeforeSend: true }]) {
    const f = fixture(options); await assert.rejects(sendLiveViewWhatsApp(f.input, f.deps)); assert.equal(f.requests.length, 0);
  }
  for (const change of [{ consent: false }, { watchPath: `/watch/${"b".repeat(43)}` }, { businessId: "another-business" }, { phone: "invalid" }]) {
    const f = fixture(); await assert.rejects(sendLiveViewWhatsApp({ ...f.input, ...change }, f.deps)); assert.equal(f.requests.length, 0);
  }
  const f = fixture(); await assert.rejects(sendLiveViewWhatsApp(f.input, { ...f.deps, entitled: async () => false })); assert.equal(f.requests.length, 0);
});

test("ambiguous provider results remain blocked on retry and never store echoed private links", async () => {
  for (const fetcher of [async () => { throw new Error("network"); }, async () => Response.json({ messages: [] }), async () => Response.json({ error: { message: watchPath } }, { status: 503 })]) {
    const f = fixture(); let calls = 0;
    f.deps.fetcher = async () => { calls++; return fetcher(); };
    assert.equal((await sendLiveViewWhatsApp(f.input, f.deps)).status, "unknown");
    assert.equal((await sendLiveViewWhatsApp(f.input, f.deps)).status, "unknown");
    assert.equal(calls, 1); assert.ok(!JSON.stringify(f.receipts).includes(watchPath));
  }
});

test("explicit provider rejection allows a deliberate retry without recording error bodies", async () => {
  const f = fixture();
  f.deps.fetcher = async () => Response.json({ error: { message: watchPath } }, { status: 400 });
  assert.equal((await sendLiveViewWhatsApp(f.input, f.deps)).status, "rejected");
  assert.ok(!JSON.stringify(f.receipts).includes(watchPath));
});
