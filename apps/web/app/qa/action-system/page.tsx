import { notFound } from "next/navigation";
import { isPreviewQaEnvironment } from "../../lib/qa-audit";
import { PublicBusinessActions } from "../../../components/public/public-business-actions";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type Item = {
  key: string;
  label: string;
  href?: string;
  external?: boolean;
  download?: string;
  icon: "whatsapp" | "call" | "directions" | "website" | "store" | "careers" | "share" | "save";
};

const ALL_ACTIONS: Item[] = [
  { key: "whatsapp", label: "واتساب", href: "https://wa.me/966500000001", external: true, icon: "whatsapp" },
  { key: "call", label: "اتصال", href: "tel:0555000001", icon: "call" },
  { key: "directions", label: "الاتجاهات", href: "https://maps.google.com/?q=24.7,46.7", external: true, icon: "directions" },
  { key: "website", label: "الموقع", href: "https://example.com", external: true, icon: "website" },
  { key: "store", label: "المتجر", href: "https://store.example.com", external: true, icon: "store" },
  { key: "careers", label: "انضم إلى فريقنا", href: "mailto:jobs@example.com?subject=%D8%B7%D9%84%D8%A8%20%D8%AA%D9%88%D8%B8%D9%8A%D9%81", icon: "careers" },
  { key: "share", label: "مشاركة", icon: "share" },
  { key: "save", label: "حفظ جهة الاتصال", href: "data:text/plain,contact", download: "contact.vcf", icon: "save" },
];

function sample(count: number) {
  return ALL_ACTIONS.slice(0, count);
}

export default function QaActionSystemPage() {
  if (!isPreviewQaEnvironment()) {
    notFound();
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#f4f7ff_0%,#eef3ff_100%)] p-4 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-black text-[#1f2552]">QA - نظام إجراءات الأعمال</h1>
        <p className="text-sm text-slate-600">صفحة QA للتحقق من استجابة شبكة أزرار الإجراءات عبر عدة أعداد.</p>

        {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
          <section key={count} id={`actions-${count}`} className="space-y-2 rounded-2xl border border-[#e4e9f7] bg-white p-3">
            <h2 className="text-sm font-black text-[#253062]">{count} إجراءات</h2>
            <PublicBusinessActions items={sample(count)} darkMode={false} />
          </section>
        ))}
      </div>
    </main>
  );
}
