// Only plain, unique, production-scoped booleans are eligible for preservation.
// Missing keys use the reviewed GitHub bootstrap configuration.
export function preservedOperationalFlags(envs, keys) {
  if (!Array.isArray(envs)) throw new Error("Invalid project environment listing");
  const preserved = new Set();
  for (const key of keys) {
    const records = envs.filter((item) => item?.key === key && !item.gitBranch && Array.isArray(item.target) && item.target.includes("production"));
    if (!records.length) continue;
    if (records.length !== 1 || records[0].type !== "plain" || !["true", "false"].includes(records[0].value)) {
      throw new Error(`Cannot safely preserve operational flag ${key}`);
    }
    preserved.add(key);
  }
  return preserved;
}
