export default function DashboardLoading() {
  return (
    <div className="space-y-4 rounded-[28px] border border-[#e9e7f3] bg-white p-6 shadow-[0_12px_32px_-28px_rgba(58,35,75,.28)]">
      <div className="h-8 w-40 animate-pulse rounded-2xl bg-[#eee9f7]" />
      <div className="h-4 w-3/4 animate-pulse rounded-full bg-[#f2eef8]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-3xl bg-[#f7f4fb]" />
        <div className="h-28 animate-pulse rounded-3xl bg-[#f7f4fb]" />
        <div className="h-28 animate-pulse rounded-3xl bg-[#f7f4fb]" />
      </div>
    </div>
  );
}
