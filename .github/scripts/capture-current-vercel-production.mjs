import { writeFile } from "node:fs/promises";

const token = String(process.env.VERCEL_TOKEN ?? "").trim();
const teamId = String(process.env.VERCEL_ORG_ID ?? "").trim();
const projectId = String(process.env.VERCEL_PROJECT_ID ?? "").trim();
const canonicalHost = String(process.env.PRODUCTION_CANONICAL_HOST ?? "hee.sa").trim().toLowerCase();
const outputPath = process.argv[2];

if (!token) throw new Error("VERCEL_TOKEN is required");
if (!teamId) throw new Error("VERCEL_ORG_ID is required");
if (!projectId) throw new Error("VERCEL_PROJECT_ID is required");
if (!outputPath) throw new Error("Usage: capture-current-vercel-production.mjs <output-file>");
if (!/^[a-z0-9.-]+$/.test(canonicalHost)) throw new Error("Invalid production canonical host");

const endpoint = new URL(`https://api.vercel.com/v13/deployments/${encodeURIComponent(canonicalHost)}`);
endpoint.searchParams.set("teamId", teamId);
endpoint.searchParams.set("withGitRepoInfo", "true");

const response = await fetch(endpoint, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: "application/json",
  },
  signal: AbortSignal.timeout(20_000),
});

if (!response.ok) {
  throw new Error(`Unable to resolve current production deployment for ${canonicalHost}: HTTP ${response.status}`);
}

const deployment = await response.json();
const id = String(deployment?.id ?? "").trim();
const url = String(deployment?.url ?? "").trim().toLowerCase();
const state = String(deployment?.readyState ?? deployment?.state ?? deployment?.status ?? "").trim().toUpperCase();
const target = String(deployment?.target ?? "").trim().toLowerCase();
const resolvedProjectId = String(deployment?.project?.id ?? deployment?.projectId ?? "").trim();
const aliases = Array.isArray(deployment?.alias) ? deployment.alias.map((value) => String(value).toLowerCase()) : [];

if (!/^dpl_[A-Za-z0-9]+$/.test(id)) throw new Error("Canonical production deployment returned an invalid deployment ID");
if (!url.endsWith(".vercel.app")) throw new Error("Canonical production deployment returned an invalid Vercel URL");
if (state !== "READY") throw new Error(`Canonical production deployment is not READY (state=${state || "unknown"})`);
if (target !== "production") throw new Error(`Canonical deployment is not a production target (target=${target || "unknown"})`);
if (resolvedProjectId && resolvedProjectId !== projectId) throw new Error("Canonical deployment belongs to an unexpected Vercel project");
if (!aliases.includes(canonicalHost)) throw new Error(`Canonical host ${canonicalHost} is not assigned to the resolved deployment`);

const record = {
  id,
  url: `https://${url}`,
  canonicalHost,
  projectId,
  gitSha: String(deployment?.meta?.githubCommitSha ?? deployment?.gitSource?.sha ?? "").trim(),
};

await writeFile(outputPath, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`production-canonical-capture: PASS id=${id} host=${canonicalHost} gitSha=${record.gitSha || "unknown"}`);
