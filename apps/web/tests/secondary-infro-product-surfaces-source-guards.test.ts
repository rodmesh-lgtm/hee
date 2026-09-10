import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const visibleSurfaces = [
  "../app/dashboard/tools/page.tsx",
  "../app/dashboard/verification/page.tsx",
  "../components/layout/navbar.tsx",
  "../components/layout/footer.tsx",
];

const dashboardSurfaces = [
  "../app/dashboard/tools/page.tsx",
  "../app/dashboard/verification/page.tsx",
];

test("secondary product surfaces retain the final INFRO identity", async () => {
  for (const path of visibleSurfaces) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /INFRO/, `INFRO identity missing from ${path}`);
    assert.doesNotMatch(source, />[^<]*\biR\b[^<]*</, `retired visible iR identity remains in ${path}`);
    assert.doesNotMatch(source, /violet-|#6f3bd2|#5b3fd6|#6543ce|#f1edff|#efeaff/i, `retired purple palette remains in ${path}`);
  }
});

test("secondary dashboard surfaces preserve readable dark-mode hierarchy", async () => {
  for (const path of dashboardSurfaces) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /text-\[#0a2426\]/, `shared dark-safe heading token missing from ${path}`);
    assert.match(source, /dark:text-slate-300/, `dark body contrast missing from ${path}`);
    assert.match(source, /dark:bg-\[#092426\]/, `dark card surface missing from ${path}`);
  }
});
