import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("concurrent OAuth callbacks converge on one identity", () => {
  assert.match(oauth, /oauth-user:\$\{provider\}:\$\{subject\}/);
  assert.match(oauth, /oauth-email:\$\{email\}/);
  assert.match(oauth, /error\.code === "P2002"/);
  assert.match(oauth, /finalIdentity/);
});
