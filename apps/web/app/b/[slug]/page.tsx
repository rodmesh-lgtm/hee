import { notFound } from "next/navigation";
import { getBusinessPublic } from "../../actions/business";

export default async function PublicBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessPublic(slug);
  if (!business || !business.isPublished) {
    notFound();
  }

  const whatsappMessage = encodeURIComponent(`السلام عليكم، أود طلب ${business.name} - ${business.products[0]?.name ?? "منتج"} بسعر ${business.products[0]?.price ?? "0"}`);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-black">H</div>
            <div>
              <div className="text-xl font-black">{business.name}</div>
              <div className="text-sm text-slate-400">{business.businessType}</div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-300">{business.description}</p>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <div>المدينة: {business.city}</div>
            <div>العنوان: {business.address}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a className="rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-slate-950" href={`https://wa.me/${business.whatsapp ?? ""}?text=${whatsappMessage}`}>واتساب</a>
            <a className="rounded-2xl border border-white/10 px-4 py-3 font-bold" href={`tel:${business.phone ?? ""}`}>اتصال</a>
            <a className="rounded-2xl border border-white/10 px-4 py-3 font-bold" href={`https://maps.google.com/?q=${encodeURIComponent(business.address ?? "")}`}>الموقع</a>
          </div>

          <div className="mt-6 space-y-3">
            {business.products.map((product) => (
              <div key={product.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black">{product.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{product.description}</div>
                  </div>
                  <div className="text-sm font-black text-indigo-300">{product.price}</div>
                </div>
                <a className="mt-4 block rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-center font-bold" href={`https://wa.me/${business.whatsapp ?? ""}?text=${encodeURIComponent(`السلام عليكم، أود طلب ${business.name} - ${product.name} بسعر ${product.price}`)}`}>اطلب الآن</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
