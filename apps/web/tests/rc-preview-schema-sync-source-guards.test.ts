import { mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const script = fileURLToPath(new URL("../scripts/sync-rc-preview-schema.mjs", import.meta.url));
for (const [environment, branch] of [["preview", "hee-v6-rc"], ["preview", "infro-business-memory-2026"], ["preview", "refine/public-bio-priority-hierarchy"], ["production", "hee-v6-rc"]]) {
  test(`build never invokes migration tooling: ${environment}/${branch}`, () => {
    const dir = mkdtempSync(join(tmpdir(), "infro-build-safety-"));
    try {
      const marker = join(dir, "tool-was-called");
      for (const tool of ["npx", "prisma", "psql"]) writeFileSync(join(dir, tool), '#!/bin/sh\ntouch "' + marker + '"\nexit 91\n', { mode: 0o755 });
      const result = spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, PATH: dir, VERCEL_ENV: environment, VERCEL_GIT_COMMIT_REF: branch, DATABASE_URL: "postgresql://fixture:do-not-connect@127.0.0.1:1/shared?sslmode=verify-full" }, timeout: 5000 });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /DISABLED/);
      assert.equal(existsSync(marker), false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
test("read-only schema compatibility gate remains in the build before compilation", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.ok(pkg.scripts.build.indexOf("assert-rc-preview-schema-current.mjs") < pkg.scripts.build.indexOf("next build"));
});
