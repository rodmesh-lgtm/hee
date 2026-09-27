"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { PlatformDesignConfig } from "../../app/lib/platform-design";
import { publishPlatformDesignAction, restorePlatformDesignAction, savePlatformDesignDraftAction } from "../../app/actions/admin-platform-design";
import { PlatformAssetField } from "./platform-asset-field";
import { PlatformBrandProvider } from "../brand/platform-brand-provider";
import { IrLogo } from "../brand/ir-logo";

const colors = [["primaryColor","اللون الرئيسي"],["secondaryColor","اللون الثانوي"],["accentColor","لون التمييز"],["backgroundColor","خلفية الصفحة"],["foregroundColor","نص الصفحة"],["headerBackground","خلفية الهيدر"],["headerForeground","نص الهيدر"],["footerBackground","خلفية الفوتر"],["footerForeground","نص الفوتر"]] as const;
const content = [["headerCtaLabel","نص زر الهيدر"],["headerCtaHref","رابط زر الهيدر"],["homeHeroTitleAr","العنوان الرئيسي"],["homeHeroSubtitleAr","وصف الصفحة الرئيسية"],["footerCopyright","حقوق الفوتر"]] as const;
const seo = [["seoTitleAr","عنوان البحث بالعربية"],["seoTitleEn","عنوان البحث بالإنجليزية"],["seoDescriptionAr","وصف البحث بالعربية"],["seoDescriptionEn","وصف البحث بالإنجليزية"]] as const;
const flags = [["robotsIndex","السماح بفهرسة المنصة"],["robotsFollow","السماح بتتبع الروابط"],["customerPageBrandingEnabled","إظهار هوية INFRO في صفحات العملاء"],["customerHeaderEnabled","إظهار رابط INFRO أعلى صفحات العملاء"],["customerFooterEnabled","إظهار تذييل INFRO في صفحات العملاء"]] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 className="mb-5 text-lg font-black">{title}</h2><div className="grid gap-4 sm:grid-cols-2">{children}</div></section>;
}

export function PlatformDesignEditor({ initial, publishedAt }: { initial: PlatformDesignConfig; publishedAt: string | null }) {
  const [draft, setDraft] = useState(initial);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [uploads, setUploads] = useState(0);
  const field = (name: keyof PlatformDesignConfig, label: string, type = "text") => <label key={name} className="grid gap-2 text-sm font-bold">{label}<input name={name} type={type} style={type === "color" ? {height:44,padding:4} : undefined} value={String(draft[name] ?? "")} onChange={e => setDraft(d => ({ ...d, [name]: e.target.value }))} className="min-w-0 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 dark:border-slate-600"/>{type === "color" ? <code dir="ltr" className="text-xs font-normal">{String(draft[name])}</code> : null}</label>;
  function save(form: FormData, publish: boolean) {
    if (uploads > 0) { setNotice("انتظر اكتمال رفع الصور قبل الحفظ."); return; }
    setNotice("");
    startTransition(async () => {
      try {
        await (publish ? publishPlatformDesignAction(form) : savePlatformDesignDraftAction(form));
        setNotice(publish ? "تم نشر الهوية والتصميم بنجاح." : "تم حفظ المسودة. التصميم المنشور لم يتغير.");
        router.refresh();
      } catch { setNotice("تعذر الحفظ. تحقق من الاتصال وصلاحية الجلسة ثم حاول مجددًا."); }
    });
  }
  return <div dir="rtl" className="space-y-6 text-slate-900 dark:text-slate-100">
    <header><h1 className="text-2xl font-black">الهوية وتصميم المنصة</h1><p className="mt-2 text-sm leading-7">تحكم بأيقونة المنصة والشعارات والألوان ومحتوى الواجهة. احفظ مسودة ثم انشر عندما تكون جاهزة.</p><p className="mt-2 text-xs text-slate-500">آخر نشر: {publishedAt ?? "الهوية الافتراضية"}</p></header>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form className="min-w-0 space-y-5" action={form => save(form, false)}>
        <fieldset disabled={pending} className="min-w-0 space-y-5">
          <Section title="الأيقونة والشعارات">
            {field("brandNameAr","اسم المنصة بالعربية")}{field("brandNameEn","اسم المنصة بالإنجليزية")}
            {([["symbolUrl","أيقونة المنصة"],["logoUrl","الشعار للخلفية الفاتحة"],["logoDarkUrl","الشعار للخلفية الداكنة"],["faviconUrl","أيقونة المتصفح"],["ogImageUrl","صورة المشاركة"]] as const).map(([name,label]) => <PlatformAssetField key={name} name={name} label={label} value={initial[name] ?? ""} onUploadChange={active => setUploads(count => count + (active ? 1 : -1))} onValueChange={url => setDraft(d => ({ ...d, [name]: url }))}/>)}
          </Section>
          <Section title="الألوان">{colors.map(([name,label]) => field(name,label,"color"))}</Section>
          <Section title="محتوى الصفحة الرئيسية">{content.map(([name,label]) => field(name,label))}</Section>
          <Section title="محركات البحث والمشاركة">{seo.map(([name,label]) => field(name,label))}<label className="grid gap-2 text-sm font-bold">الكلمات المفتاحية<input name="seoKeywords" defaultValue={initial.seoKeywords.join(", ")} className="min-w-0 rounded-xl border bg-transparent p-3"/></label></Section>
          <Section title="خيارات الظهور">{flags.map(([name,label]) => <label key={name} className="flex items-center gap-3 text-sm"><input type="checkbox" name={name} checked={draft[name]} onChange={e => setDraft(d => ({ ...d, [name]: e.target.checked }))}/>{label}</label>)}</Section>
          <div className="sticky bottom-3 z-30 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <button disabled={uploads > 0} className="rounded-xl border px-4 py-3 text-sm font-bold" type="submit">حفظ مسودة</button>
            <button disabled={uploads > 0} className="rounded-xl bg-teal-800 px-4 py-3 text-sm font-bold text-white" formAction={form => save(form,true)}>نشر التعديلات</button>
            <button disabled={uploads > 0} type="button" className="rounded-xl px-3 py-3 text-xs text-rose-700 dark:text-rose-300" onClick={() => { startTransition(async () => { try { await restorePlatformDesignAction(); router.refresh(); setNotice("استعيدت الإعدادات الافتراضية كمسودة فقط."); } catch { setNotice("تعذرت استعادة المسودة."); } }); }}>استعادة الافتراضي كمسودة</button>
          </div>
        </fieldset>
        <p role="status" aria-live="polite" className="text-sm font-bold">{pending ? "جارٍ الحفظ…" : notice}</p>
      </form>
      <aside className="overflow-hidden rounded-2xl border border-slate-200 xl:sticky xl:top-24 dark:border-slate-700">
        <h2 className="bg-slate-100 p-4 font-bold dark:bg-slate-800">معاينة فورية للمسودة</h2>
        <PlatformBrandProvider value={draft}><div style={{ background: draft.backgroundColor, color: draft.foregroundColor }}>
          <div className="p-5" style={{ background: draft.headerBackground, color: draft.headerForeground }}><IrLogo className="h-12"/></div>
          <div className="space-y-4 p-5"><h3 className="text-xl font-black">{draft.homeHeroTitleAr}</h3><p className="text-sm leading-7">{draft.homeHeroSubtitleAr}</p><span className="inline-block rounded-xl px-4 py-2 text-sm font-bold" style={{ background: draft.primaryColor, color: draft.foregroundColor }}>{draft.headerCtaLabel}</span><div className="flex gap-2">{[draft.primaryColor,draft.secondaryColor,draft.accentColor].map((color,index) => <span key={index} className="h-8 w-8 rounded-full" style={{ background:color }}/>)}</div></div>
          <div className="p-4 text-xs" style={{ background:draft.footerBackground,color:draft.footerForeground }}>{draft.footerCopyright}</div>
        </div></PlatformBrandProvider>
        <p className="p-4 text-xs leading-6">الرفع والحفظ لا يغيران الهوية المنشورة. النشر متاح لإدارة المنصة ويُسجّل في سجل التدقيق. خيارات صفحات العملاء تخص هوية INFRO ولا تغيّر شعار المنشأة أو ترتيب محتواها.</p>
      </aside>
    </div>
  </div>;
}
