import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const RELEASE = "1111111111111111111111111111111111111111";
const PARENT_A = "2222222222222222222222222222222222222222";
const PARENT_B = "3333333333333333333333333333333333333333";
const TREE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_TREE = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const gate = resolve(process.cwd(), "../../.github/scripts/require-release-quality.sh");

async function runFixture(fixture: {
  exactRuns?: number;
  parents?: string[];
  parentTrees?: Record<string, string>;
  parentRuns?: Record<string, number>;
}) {
  const dir = await mkdtemp(join(tmpdir(), "hee-release-quality-"));
  const fakeGh = join(dir, "gh");
  const payload = Buffer.from(JSON.stringify(fixture), "utf8").toString("base64");
  await writeFile(fakeGh, `#!/usr/bin/env node\nconst args=process.argv.slice(2).join(" ");\nconst f=JSON.parse(Buffer.from(process.env.FIXTURE_B64,"base64").toString("utf8"));\nconst release=process.env.GITHUB_SHA;\nconst tree=process.env.RELEASE_TREE;\nconst parentA=process.env.PARENT_A;\nconst parentB=process.env.PARENT_B;\nif (args.includes("/actions/workflows/rc-quality.yml/runs?head_sha=")) {\n  const m=args.match(/head_sha=([0-9a-f]{40})/);\n  const sha=m?.[1] ?? "";\n  if (sha===release) console.log(String(f.exactRuns ?? 0));\n  else console.log(String(f.parentRuns?.[sha] ?? 0));\n  process.exit(0);\n}\nif (args.includes("/git/commits/"+release)) {\n  console.log(JSON.stringify({tree:{sha:tree},parents:(f.parents ?? []).map((sha)=>({sha}))}));\n  process.exit(0);\n}\nfor (const parent of [parentA,parentB]) {\n  if (args.includes("/git/commits/"+parent)) {\n    console.log(String(f.parentTrees?.[parent] ?? ""));\n    process.exit(0);\n  }\n}\nconsole.error("unexpected fake gh call", args);\nprocess.exit(90);\n`, "utf8");
  await chmod(fakeGh, 0o755);

  try {
    return spawnSync("bash", [gate], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH ?? ""}`,
        FIXTURE_B64: payload,
        GITHUB_REPOSITORY: "rodmesh-lgtm/hee",
        GITHUB_SHA: RELEASE,
        RELEASE_TREE: TREE,
        PARENT_A,
        PARENT_B,
      },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("release quality provenance accepts a green exact release SHA", async () => {
  const result = await runFixture({ exactRuns: 1, parents: [] });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS exact SHA/);
});

test("release quality provenance accepts only a tree-identical directly tested merge parent", async () => {
  const result = await runFixture({
    exactRuns: 0,
    parents: [PARENT_A, PARENT_B],
    parentTrees: { [PARENT_A]: OTHER_TREE, [PARENT_B]: TREE },
    parentRuns: { [PARENT_A]: 1, [PARENT_B]: 1 },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`tree-identical directly tested parent ${PARENT_B}`));
});

test("release quality provenance refuses inheritance for a normal one-parent commit", async () => {
  const result = await runFixture({
    exactRuns: 0,
    parents: [PARENT_A],
    parentTrees: { [PARENT_A]: TREE },
    parentRuns: { [PARENT_A]: 1 },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /is not a merge commit/);
});

test("release quality provenance refuses a tested merge parent when its tree differs", async () => {
  const result = await runFixture({
    exactRuns: 0,
    parents: [PARENT_A, PARENT_B],
    parentTrees: { [PARENT_A]: OTHER_TREE, [PARENT_B]: OTHER_TREE },
    parentRuns: { [PARENT_A]: 1, [PARENT_B]: 1 },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /FAIL no exact-SHA or tree-identical direct-parent/);
});

test("release quality provenance refuses a tree-identical merge parent without green RC", async () => {
  const result = await runFixture({
    exactRuns: 0,
    parents: [PARENT_A, PARENT_B],
    parentTrees: { [PARENT_A]: OTHER_TREE, [PARENT_B]: TREE },
    parentRuns: { [PARENT_A]: 1, [PARENT_B]: 0 },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /FAIL no exact-SHA or tree-identical direct-parent/);
});
