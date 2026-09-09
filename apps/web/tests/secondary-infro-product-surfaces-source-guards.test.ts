import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const visibleSurfaces = [
  "../app/dashboard/tools/page.tsx",
  "../app/dashboard/verification/page.tsx",
  "../components/layout/navbar.tsx",
  "../components/layout/footer.tsx",
];

test("secondary product surfaces retain the final INFRO identity", async () => {
  for (const path of visibleSurfaces) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /INFRO/, `INFRO identity missing from ${path}`);
    assert.doesNotMatch(source, />[^<]*\biR\b[^<]*</, `retired visible iR identity remains in ${path}`);
    assert.doesNotMatch(source, /violet-|#6f3bd2|#5b3fd6|#6543ce|#f1edff|#efeaff/i, `retired purple palette remains in ${path}`);
  }
});
