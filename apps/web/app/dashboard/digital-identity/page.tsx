import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Download, ExternalLink, FileText, Link2, QrCode, SearchCheck } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { updateCompanyProfileAction, removeCompanyProfileAction } from "../../actions/digital-identity";

function qrUrl(value: string) { return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(value)}`; }

export default async function DigitalIdentityPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");
  const params = await searchParams;
  const profile = Array.isArray(params?.profile) ? params?.profile[0] : params?.profile;
  const publicUrl = `https://hee.sa/${business.slug}`;
  const identityChecks = [
    { label: "شعار المنشأة", ok: Boolean(business.logoUrl) },
    { label: "وصف واضح", ok: Boolean(business.shortDescription || business.description) },
    { label: "وسيلة تواصل", ok: Boolean(business.whatsapp || business.phone || business.email) },
    { label: "موقع المنشأة", ok: Boolean(business.city || business.address || business.googleMapsLink) },
    { label: "الملف التعريفي PDF", ok: Boolean(business.companyProfileUrl) },
    { label: "الصفحة منشورة", ok: Boolean(business.isPublished && user.emailVerifiedAt) },
  ];
  const complete = identityChecks.filter((item) => item.ok).length;

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-[#6f3bd2]" /><h1 className="text-xl font-black text-[#20264f]">الهوية الرقمية</h1></div><p className="mt-1 text-sm text-slate-500">مركز واحد لأصول منشأتك الرقمية الجاهزة للمشاركة مع العملاء والشركاء.</p></div><span className="rounded-full bg-[#f1edff] px-3 py-1.5 text-xs font-black text-[#5d49cc]">{complete}/{identityChecks.length} مكتمل</span></div></section>

    {profile === "saved" ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">تم حفظ الملف التعريفي PDF وأصبح مرتبطًا بالمنشأة.</div> : null}
    {profile === "removed" ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">تمت إزالة الملف التعريفي.</div> : null}
    {profile && !["saved", "removed"].includes(profile) ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">تعذر تحديث الملف التعريفي. ارفع ملف PDF صالحًا ضمن الحد المسموح ثم حاول مجددًا.</div> : null}

    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">الملف التعريفي للشركة PDF</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">ارفع Company Profile الرسمي. عند نشر الصفحة يستطيع الزائر فتحه مباشرة، مع بقاء الملف محميًا من الوصول العام عندما تكون الصفحة غير منشورة.</p>{business.companyProfileUrl ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3"><b className="block text-sm text-emerald-800">{business.companyProfileTitle || "الملف التعريفي للشركة"}</b><div className="mt-3 flex flex-wrap gap-2"><a href={business.companyProfileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-emerald-800"><ExternalLink className="h-4 w-4" />فتح الملف</a><form action={removeCompanyProfileAction}><button className="min-h-10 rounded-xl border border-rose-200 bg-white px-3 text-xs font-black text-rose-700">إزالة</button></form></div></div> : null}<form action={updateCompanyProfileAction} encType="multipart/form-data" className="mt-4 space-y-3"><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>عنوان الملف</span><input name="profileTitle" defaultValue={business.companyProfileTitle || "الملف التعريفي للشركة"} maxLength={120} className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3" /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>{business.companyProfileUrl ? "استبدال ملف PDF" : "ملف PDF"}</span><input name="profileFile" type="file" required accept="application/pdf,.pdf" className="block min-h-11 rounded-xl border border-[#e5e8f3] bg-white px-3 py-2 text-xs" /></label><button className="min-h-11 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white">{business.companyProfileUrl ? "استبدال الملف" : "رفع الملف التعريفي"}</button></form></article>

      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><QrCode className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">QR للصفحة الرقمية</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">استخدمه في الكروت، الفواتير، المعرض، التغليف أو مقر المنشأة للوصول المباشر إلى صفحتك.</p><div className="mt-4 flex flex-col items-center rounded-2xl bg-[#faf9fd] p-4"><img src={qrUrl(publicUrl)} alt={`QR لصفحة ${business.name}`} width={180} height={180} className="h-[180px] w-[180px] rounded-xl bg-white p-2" /><code dir="ltr" className="mt-3 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-slate-500">{publicUrl}</code><div className="mt-3 flex flex-wrap justify-center gap-2"><a href={qrUrl(publicUrl)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ddd8f4] bg-white px-3 text-xs font-black text-[#5d49cc]"><Download className="h-4 w-4" />فتح QR</a><Link href={`/${business.slug}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#6f3bd2] px-3 text-xs font-black text-white"><ExternalLink className="h-4 w-4" />فتح الصفحة</Link></div></div></article>
    </section>

    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">بطاقة جهة الاتصال vCard</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">ملف اتصال قابل للحفظ على الجوال باسم المنشأة، ويستخدم بيانات الهاتف والبريد والموقع المسجلة في HEE.</p><a href="/api/dashboard/vcard" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white"><Download className="h-4 w-4" />تنزيل vCard</a></article><article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><SearchCheck className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">اكتمال الهوية الرقمية</h2></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{identityChecks.map((item) => <div key={item.label} className={`rounded-xl border px-3 py-2 text-xs font-bold ${item.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{item.ok ? "✓" : "○"} {item.label}</div>)}</div><p className="mt-3 text-[11px] leading-5 text-slate-500">تتضمن الصفحة العامة أصلًا بيانات SEO وOpen Graph وSchema.org لزيادة وضوح هوية المنشأة لمحركات البحث ومنصات المشاركة.</p></article></section>
  </div>;
}
