import { MapPin, QrCode, ShieldCheck, ShoppingCart, Store, WandSparkles, MessageCircle } from "lucide-react";

const products = [
  { name: "برجر كلاسيك", price: "٣٤ ر.س" },
  { name: "كيكة الشوكولاتة", price: "١٨ ر.س" },
  { name: "قهوة عربية", price: "١٢ ر.س" },
];

export function PhonePreview() {
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-[36px] border border-slate-200 bg-slate-950 p-3 shadow-[0_30px_90px_-20px_rgba(15,23,42,0.45)]">
      <div className="rounded-[30px] bg-white p-4 text-right">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-black text-indigo-700">
              م
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-900">مطعم النخلة</p>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500">متجر موثّق</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            متاح الآن
          </span>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-950 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MessageCircle className="h-4 w-4" />
              واتساب
            </div>
            <span className="text-xs text-emerald-300"> سريع التواصل</span>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 p-3">
            <span className="text-sm">مكالمة سريعة</span>
            <span className="text-sm font-bold">055 000 0000</span>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShoppingCart className="h-4 w-4 text-indigo-700" />
            المنتجات
          </div>
          <div className="space-y-2">
            {products.map((product) => (
              <div key={product.name} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                <span>{product.name}</span>
                <span className="font-bold text-slate-900">{product.price}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-indigo-700" />
              الموقع
            </div>
            <p className="text-xs text-slate-600">حي النخيل، الرياض</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
            <div className="mb-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-900">
              <QrCode className="h-4 w-4 text-indigo-700" />
              QR
            </div>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-slate-900 text-[10px] font-black text-white">
              QR
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-orange-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
            <WandSparkles className="h-4 w-4 text-indigo-700" />
            العروض
          </div>
          <p className="text-sm text-slate-600">خصم ٢٠٪ على الطلبات خلال اليوم</p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
          <Store className="h-3.5 w-3.5" />
          تجربة متجر جاهزة للعرض
        </div>
      </div>
    </div>
  );
}
