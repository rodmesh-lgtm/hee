export function normalizeWorkspaceSearch(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/ـ/g, "").replace(/ى/g, "ي").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function workspaceSearchMatches(text: string, query: string) {
  const normalized = normalizeWorkspaceSearch(text);
  return normalizeWorkspaceSearch(query).split(" ").filter(Boolean).every(word => normalized.includes(word));
}
