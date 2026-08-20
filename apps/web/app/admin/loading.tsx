export default function AdminLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-[#1f2552] sm:px-6" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-28 animate-pulse rounded-[26px] border border-[#e7e4f0] bg-white" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-[20px] border border-[#e7e4f0] bg-white" />)}
        </div>
        <div className="h-80 animate-pulse rounded-[24px] border border-[#e7e4f0] bg-white" />
        <p className="sr-only">جاري تحميل لوحة إدارة المنصة</p>
      </div>
    </main>
  );
}
