/** The most specific registered route owns the active state, even while filtering. */
export function activeWorkspaceRoute(pathname: string, hrefs: readonly string[], root: string) {
  const path = pathname.replace(/\/$/, '') || '/';
  return hrefs.filter(href => path === href || (href !== root && path.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0] ?? null;
}
export function matchesWorkspaceSearch(query: string, ...labels: string[]) {
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').trim();
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const text = normalize(labels.join(' '));
  return terms.every(term => text.includes(term));
}
