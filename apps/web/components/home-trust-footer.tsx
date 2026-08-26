import Link from "next/link";

export function HomeTrustFooter() {
  return (
    <footer dir="rtl" className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-end font-black leading-none tracking-[-0.12em] text-[#7146d9] text-[24px]" aria-label="iR">
            <span className="relative mr-[1px] text-[0.62em] font-extrabold lowercase">i<span className="absolute -top-[0.34em] left-1/2 h-[0.2em] w-[0.2em] -translate-x-1/2 rounded-full bg-[#9b79ec]" /></span>
            <span className="uppercase">R</span>
          </div>
          <p className="mt-2 max-w-xl text-xs leading-6 text-slate-500">
            iR منصة هوية أعمال رقمية للمنشآت في السعودية على ir.sa. معلومات الاشتراك والدفع والإلغاء موضحة قبل إتمام أي عملية مدفوعة.
          </p>
        </div>
        <nav aria-label="روابط الثقة والسياسات" className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold">
          <Link href="/terms" className="min-h-11 inline-flex items-center hover:text-[#7146d9]">الشروط والأحكام</Link>
          <Link href="/privacy" className="min-h-11 inline-flex items-center hover:text-[#7146d9]">سياسة الخصوصية</Link>
          <Link href="/contact" className="min-h-11 inline-flex items-center hover:text-[#7146d9]">تواصل معنا</Link>
          <Link href="/dashboard/billing/manage" className="min-h-11 inline-flex items-center hover:text-[#7146d9]">إدارة الاشتراك</Link>
        </nav>
      </div>
    </footer>
  );
}
