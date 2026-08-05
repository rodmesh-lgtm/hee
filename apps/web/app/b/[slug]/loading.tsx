export default function PublicBusinessLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(119,132,255,0.14),_transparent_46%),linear-gradient(180deg,#f7f9ff_0%,#f3f6ff_100%)] px-3 py-6 text-slate-900 sm:px-4 lg:px-8">
      <div className="mx-auto w-full max-w-[1240px] space-y-4">
        <section className="animate-pulse overflow-hidden rounded-[24px] border border-[#e8ebf7] bg-white shadow-[0_24px_44px_-36px_rgba(39,56,110,0.45)]">
          <div className="h-[220px] rounded-t-[24px] bg-[#eef2ff] md:h-[310px] lg:h-[350px]" />
          <div className="relative px-4 pb-3 pt-10 sm:px-6">
            <div className="absolute -top-10 right-4 h-20 w-20 rounded-[20px] bg-[#edf1ff] sm:-top-12 sm:right-5 sm:h-24 sm:w-24" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div className="space-y-2">
                <div className="h-6 w-56 rounded bg-[#edf1ff]" />
                <div className="h-4 w-40 rounded bg-[#edf1ff]" />
                <div className="h-14 max-w-[640px] rounded-2xl bg-[#f3f6ff]" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-28 rounded-full bg-[#edf1ff]" />
                  <div className="h-7 w-24 rounded-full bg-[#edf1ff]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-12 w-full rounded-xl bg-[#edf1ff]" />
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <div className="h-11 rounded-xl bg-[#f3f6ff]" />
                  <div className="h-11 rounded-xl bg-[#f3f6ff]" />
                  <div className="h-11 rounded-xl bg-[#f3f6ff]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="animate-pulse rounded-[24px] border border-[#e8ebf7] bg-white p-4 shadow-[0_24px_44px_-36px_rgba(39,56,110,0.45)]">
          <div className="mb-4 h-5 w-28 rounded bg-[#edf1ff]" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-40 rounded-2xl bg-[#f4f7ff]" />
            <div className="h-40 rounded-2xl bg-[#f4f7ff]" />
            <div className="h-40 rounded-2xl bg-[#f4f7ff]" />
          </div>
        </section>

        <p className="text-center text-sm text-slate-500">جاري تحميل صفحة النشاط...</p>
      </div>
    </main>
  );
}
