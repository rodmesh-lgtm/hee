import type { ComparisonRow, ComparisonSource } from './comparison';

export function comparisonReadiness(source: ComparisonSource, period: { from: string; until: string }) {
  if (source.error) return 'failed' as const;
  if (!source.report) return 'pending' as const;
  if (source.report.from !== period.from || source.report.until !== period.until) return 'period' as const;
  if (!source.report.complete) return 'partial' as const;
  return 'ready' as const;
}

export type PeerInsight = { row: ComparisonRow; kind: 'average' | 'cancellation'; observed: number; benchmark: number; peers: number };
function median(values: number[]) {
  const ordered = values.toSorted((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : ordered[middle - 1] / 2 + ordered[middle] / 2;
}
/** Descriptive comparisons, never predictions. Leave the target out of its peer benchmark. */
export function peerInsights(rows: ComparisonRow[], complete: boolean): PeerInsight[] {
  if (!complete) return [];
  const insights: PeerInsight[] = [];
  for (const row of rows) {
    const peers = rows.filter(peer => peer.id !== row.id && peer.currency === row.currency && peer.decimals === row.decimals);
    const averages = peers.filter(peer => peer.orders - peer.cancelled >= 10 && peer.average !== null && peer.average > 0);
    if (row.orders - row.cancelled >= 10 && row.average !== null && row.average >= 0 && averages.length >= 2) {
      const benchmark = median(averages.map(peer => peer.average!));
      if (row.average <= benchmark * 0.8) insights.push({ row, kind: 'average', observed: row.average, benchmark, peers: averages.length });
    }
    const cancellations = peers.filter(peer => peer.orders >= 20 && peer.cancellationRate !== null);
    if (row.orders >= 20 && row.cancelled >= 3 && row.cancellationRate !== null && cancellations.length >= 2) {
      const benchmark = median(cancellations.map(peer => peer.cancellationRate!));
      if (row.cancellationRate >= benchmark + 5) insights.push({ row, kind: 'cancellation', observed: row.cancellationRate, benchmark, peers: cancellations.length });
    }
  }
  return insights.sort((a, b) => a.kind.localeCompare(b.kind) || a.row.id.localeCompare(b.row.id));
}
