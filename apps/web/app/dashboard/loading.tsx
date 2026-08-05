export default function DashboardLoading() {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="h-8 w-40 animate-pulse rounded-2xl bg-white/10" />
      <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-3xl bg-white/10" />
        <div className="h-28 animate-pulse rounded-3xl bg-white/10" />
        <div className="h-28 animate-pulse rounded-3xl bg-white/10" />
      </div>
    </div>
  );
}
