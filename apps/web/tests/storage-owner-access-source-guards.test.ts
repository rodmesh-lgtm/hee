import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("private stored objects are readable only by the owning tenant session", () => {
  const route = source("app/api/storage/[storageKey]/route.ts");

  assert.match(route, /import \{ getCurrentUser \} from "\.\.\/\.\.\/\.\.\/lib\/auth"/);
  assert.match(route, /async function ownerCanReadObject/);
  assert.match(route, /ownerId: user\.id/);
  assert.match(route, /deletedAt: null/);
  assert.match(route, /\.\.\.\(tenantId \? \{ id: tenantId \} : \{\}\)/);
  assert.match(route, /!publiclyAvailable && !\(await ownerCanReadObject\(metadata\.id, tenantId, "company-profile"\)\)/);
  assert.match(route, /!publiclyAvailable && !\(await ownerCanReadObject\(metadata\.id, tenantId, "image"\)\)/);
});

test("stored-object responses stay private and non-cacheable after owner access is added", () => {
  const route = source("app/api/storage/[storageKey]/route.ts");
  assert.match(route, /const AUTHORIZED_FILE_CACHE_CONTROL = "private, no-store, max-age=0"/);
  assert.match(route, /"X-Content-Type-Options": "nosniff"/);
  assert.match(route, /"Content-Security-Policy"/);
});