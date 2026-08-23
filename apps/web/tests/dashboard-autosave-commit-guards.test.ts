import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("published contact availability is rechecked under a transaction lock", () => {
  const route = source("app/api/dashboard/business/autosave/route.ts");

  assert.match(route, /db\.\$transaction\(async \(tx\) =>/);
  assert.match(route, /pg_advisory_xact_lock\(hashtext/);
  assert.match(route, /business-autosave:\$\{business\.id\}/);
  assert.match(route, /select: \{ isPublished: true, whatsapp: true, phone: true, email: true, website: true \}/);
  assert.match(route, /Object\.prototype\.hasOwnProperty\.call\(updates, "whatsapp"\)/);
  assert.match(route, /Object\.prototype\.hasOwnProperty\.call\(updates, "phone"\)/);
  assert.match(route, /current\.isPublished && !Boolean\(nextWhatsapp \|\| nextPhone \|\| current\.email\?\.trim\(\) \|\| current\.website\?\.trim\(\)\)/);
  assert.match(route, /await tx\.business\.updateMany/);
});