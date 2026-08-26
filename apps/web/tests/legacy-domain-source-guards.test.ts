import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import test from "node:test";

const webRoot = resolve(process.cwd());
const repoRoot = resolve(webRoot, "../..");
const legacyDomain = /(?:https?:\/\/)?(?:www\.|admin\.)?hee\.sa|@hee\.sa/i;

function collectFiles(root: string, extensions: Set<string>) {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = resolve(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (["node_modules", ".next", ".git", "coverage"].includes(entry)) continue;
      files.push(...collectFiles(path, extensions));
      continue;
    }
    const extension = entry.includes(".") ? entry.slice(entry.lastIndexOf(".")) : "";
    if (extensions.has(extension)) files.push(path);
  }
  return files;
}

test("operational source contains no legacy hee.sa production references", () => {
  const files = [
    ...collectFiles(resolve(webRoot, "app"), new Set([".ts", ".tsx", ".js", ".mjs"])),
    ...collectFiles(resolve(webRoot, "components"), new Set([".ts", ".tsx", ".js", ".mjs"])),
    ...collectFiles(resolve(webRoot, "scripts"), new Set([".ts", ".tsx", ".js", ".mjs", ".sh"])),
    ...collectFiles(resolve(repoRoot, ".github"), new Set([".yml", ".yaml", ".js", ".mjs", ".sh"])),
    ...collectFiles(resolve(repoRoot, "docs"), new Set([".md", ".txt", ".yml", ".yaml", ".sh"])),
    resolve(webRoot, "next.config.ts"),
    resolve(webRoot, "README.md"),
    resolve(repoRoot, ".env.example"),
  ];

  const violations = files.flatMap((path) => {
    const source = readFileSync(path, "utf8");
    return legacyDomain.test(source) ? [relative(repoRoot, path)] : [];
  });

  assert.deepEqual(violations, [], `Legacy production domain references remain:\n${violations.join("\n")}`);
});
