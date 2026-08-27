import { Globe2, Search, Share2 } from "lucide-react";
import { updateDigitalPresenceAction } from "../../app/actions/digital-presence";

type Props = {
  business: {
    nameEn?: string | null; email?: string | null; website?: string | null; address?: string | null;
    instagramUrl?: string | null; xUrl?: string | null; tiktokUrl?: string | null; snapchatUrl?: string | null; facebookUrl?: string | null;
    metaTitle?: string | null; metaDescription?: string | null;
  };
  presenceStatus?: string;
};

const input = "h-11 w-full rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm text-[#20264f] outline-none transition focus:border-[#b7a9ef] focus:bg-white aria-[invalid=true]:border-rose-400 aria-[invalid=true]:bg-rose-50";
const errors: Record<string, string> = {
  "invalid-email": "البريد التجاري غير صالح. أدخل بريدًا بصيغة name@example.com أو اترك الحقل فارغًا.",
  "invalid-url": "رابط الموقع الإلكتروني غير صالح. أدخل نطاقًا صحيحًا مثل example.com أو رابط HTTPS كاملًا.",
  "invalid-instagram": "رابط Instagram يجب أن يكون من instagram.com فقط.",
  "invalid-x": "رابط X يجب أن يكون من x.com أو twitter.com فقط.",
  "invalid-tiktok": "رابط TikTok يجب أن يكون من tiktok.com فقط.",
  "invalid-snapchat": "رابط Snapchat يجب أن يكون من snapchat.com فقط.",
  "invalid-facebook": "رابط Facebook يجب أن يكون من facebook.com أو fb.com فقط.",
  "invalid-nameEn": "الاسم بالإنجليزية يتجاوز الحد المسموح وهو 120 حرفًا.",
  "invalid-address": "العنوان يتجاوز الحد المسموح وهو 240 حرفًا.",
  "invalid-metaTitle": "عنوان SEO يتجاوز 70 حرفًا.",
  "invalid-metaDescription": "وصف SEO يتجاوز 180 حرفًا.",
  "rate-limited": "تم إجراء عدد كبير من محاولات الحفظ. انتظر قليلًا ثم أعد المحاولة.",
  missing: "تعذر العثور على المنشأة النشطة. حدّث الصفحة ثم أعد المحاولة.",
  error: "حدث خطأ أثناء الحفظ. لم يتم تغيير بياناتك؛ أعد المحاولة بعد قليل.",
  invalid: "توجد قيمة غير صالحة في النموذج. راجع الحقول المحددة ثم أعد المحاولة.",
  "invalid-social": "أحد روابط الشبكات الاجتماعية لا يطابق النطاق الرسمي للخدمة.",
};
function invalid(status: string | undefined, field: string) {
  if (!status) return false;
  const map: Record<string, string> = { email: "invalid-email", website: "invalid-url", instagramUrl: "invalid-instagram", xUrl: "invalid-x", tiktokUrl: "invalid-tiktok", snapchatUrl: "invalid-snapchat", facebookUrl: "invalid-facebook", nameEn: "invalid-nameEn", address: "invalid-address", metaTitle: "invalid-metaTitle", metaDescription: "invalid-metaDescription" };
  return status === map[field];
}

export function DigitalPresenceForm({ business, presenceStatus }: Props) {
  const errorMessage = presenceStatus ? errors[presenceStatus] : undefined;
  return <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
    <div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">الحضور الرقمي وSEO</h2></div>
    <p className="mt-2 text-xs leading-6 text-slate-500">أكمل بيانات المنشأة التي تظهر للزوار ومحركات البحث ومنصات المشاركة. جميع الحقول اختيارية، والروابط الاجتماعية لا تُقبل إلا على نطاقاتها الرسمية.</p>
    {presenceStatus === "saved" ? <div role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">تم حفظ الحضور الرقمي.</div> : null}
    {presenceStatus === "contact-required" ? <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">الصفحة منشورة؛ يجب الإبقاء على وسيلة تواصل واحدة على الأقل: هاتف أو واتساب أو بريد تجاري أو موقع إلكتروني.</div> : null}
    {errorMessage ? <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{errorMessage}</div> : null}
    <form action={updateDigitalPresenceAction} className="mt-4 space-y-5">
      <div><div className="mb-3 flex items-center gap-2 text-sm font-black text-[#20264f]"><Globe2 className="h-4 w-4 text-[#6f3bd2]" />بيانات المنشأة</div><div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>الاسم بالإنجليزية</span><input name="nameEn" defaultValue={business.nameEn ?? ""} maxLength={120} dir="ltr" aria-invalid={invalid(presenceStatus, "nameEn")} className={input} /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>البريد التجاري</span><input name="email" type="email" defaultValue={business.email ?? ""} maxLength={254} dir="ltr" autoComplete="email" aria-invalid={invalid(presenceStatus, "email")} className={input} /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>الموقع الإلكتروني</span><input name="website" defaultValue={business.website ?? ""} maxLength={500} dir="ltr" inputMode="url" placeholder="https://example.com" aria-invalid={invalid(presenceStatus, "website")} className={input} /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>العنوان</span><input name="address" defaultValue={business.address ?? ""} maxLength={240} aria-invalid={invalid(presenceStatus, "address")} className={input} /></label>
      </div></div>
      <div><div className="mb-3 flex items-center gap-2 text-sm font-black text-[#20264f]"><Share2 className="h-4 w-4 text-[#6f3bd2]" />الشبكات الاجتماعية</div><div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>Instagram</span><input name="instagramUrl" defaultValue={business.instagramUrl ?? ""} maxLength={500} dir="ltr" inputMode="url" placeholder="https://instagram.com/..." aria-invalid={invalid(presenceStatus, "instagramUrl")} className={input} /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>X</span><input name="xUrl" defaultValue={business.xUrl ?? ""} maxLength={500} dir="ltr" inputMode="url" placeholder="https://x.com/..." aria-invalid={invalid(presenceStatus, "xUrl")} className={input} /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>TikTok</span><input name="tiktokUrl" defaultValue={business.tiktokUrl ?? ""} maxLength={500} dir="ltr" inputMode="url" placeholder="https://tiktok.com/@..." aria-invalid={invalid(presenceStatus, "tiktokUrl")} className={input} /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>Snapchat</span><input name="snapchatUrl" defaultValue={business.snapchatUrl ?? ""} maxLength={500} dir="ltr" inputMode="url" placeholder="https://snapchat.com/add/..." aria-invalid={invalid(presenceStatus, "snapchatUrl")} className={input} /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600 sm:col-span-2"><span>Facebook</span><input name="facebookUrl" defaultValue={business.facebookUrl ?? ""} maxLength={500} dir="ltr" inputMode="url" placeholder="https://facebook.com/..." aria-invalid={invalid(presenceStatus, "facebookUrl")} className={input} /></label>
      </div></div>
      <div><div className="mb-3 flex items-center gap-2 text-sm font-black text-[#20264f]"><Search className="h-4 w-4 text-[#6f3bd2]" />ظهور محركات البحث</div><div className="grid gap-3">
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>عنوان SEO</span><input name="metaTitle" defaultValue={business.metaTitle ?? ""} maxLength={70} aria-invalid={invalid(presenceStatus, "metaTitle")} className={input} /><span className="font-normal text-slate-400">حتى 70 حرفًا. عند تركه فارغًا يستخدم iR اسم المنشأة.</span></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>وصف SEO</span><textarea name="metaDescription" defaultValue={business.metaDescription ?? ""} maxLength={180} rows={3} aria-invalid={invalid(presenceStatus, "metaDescription")} className="w-full rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 py-3 text-sm text-[#20264f] outline-none focus:border-[#b7a9ef] focus:bg-white aria-[invalid=true]:border-rose-400 aria-[invalid=true]:bg-rose-50" /><span className="font-normal text-slate-400">حتى 180 حرفًا ويستخدم في نتائج البحث والمشاركة.</span></label>
      </div></div>
      <button className="min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white">حفظ الحضور الرقمي</button>
    </form>
  </section>;
}
