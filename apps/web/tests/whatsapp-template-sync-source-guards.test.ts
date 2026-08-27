import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("template persistence is tenant-owned through the connection at PostgreSQL level", () => {
  const migration = source("prisma/migrations/20260827184500_whatsapp_templates/migration.sql");
  assert.match(migration, /WhatsAppConnection_id_business_unique/);
  assert.match(migration, /FOREIGN KEY \("connectionId", "businessId"\) REFERENCES "WhatsAppConnection"\("id", "businessId"\)/);
  assert.match(migration, /WhatsAppTemplate_provider_id_unique/);
});

test("Meta template sync is bounded, credential-safe and does not trust paging URLs", () => {
  const sync = source("app/lib/whatsapp/template-sync.ts");
  assert.match(sync, /decryptWhatsAppCredential/);
  assert.match(sync, /authorization: `Bearer \$\{input\.accessToken\}`/);
  assert.match(sync, /AbortSignal\.timeout\(15_000\)/);
  assert.match(sync, /for \(let page = 0; page < 20; page \+= 1\)/);
  assert.match(sync, /url\.searchParams\.set\("after", result\.after\)/);
  assert.doesNotMatch(sync, /fetch\(paging\.next|new URL\(paging\.next/);
});

test("unknown or stale Meta templates remain unavailable for outbound use", () => {
  const domain = source("app/lib/whatsapp/template-domain.ts");
  const sync = source("app/lib/whatsapp/template-sync.ts");
  assert.match(domain, /template\.status === "approved" && template\.category !== "unknown"/);
  assert.match(sync, /status: "disabled", providerStatus: "NOT_RETURNED_BY_SYNC"/);
  assert.match(sync, /META_WHATSAPP_TEMPLATE_TENANT_COLLISION/);
});
