import Link from "next/link";

export function HomeTrustFooter() {
  return (
    <footer dir="rtl" className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-black tracking-[-.06em] text-[#6f3bd2]">HEE</div>
          <p className="mt-1 max-w-xl text-xs leading-6 text-slate-500">
            منصة هوية أعمال رقمية للمنشآت في السعودية. معلومات الاشتراك والدفع والإلغاء موضحة قبل إتمام أي عملية مدفوعة.
          </p>
        </div>
        <nav aria-label="روابط الثقة والسياسات" className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold">
          <Link href="/terms" className="min-h-11 inline-flex items-center hover:text-[#6f3bd2]">الشروط والأحكام</Link>
          <Link href="/privacy" className="min-h-11 inline-flex items-center hover:text-[#6f3bd2]">سياسة الخصوصية</Link>
          <Link href="/contact" className="min-h-11 inline-flex items-center hover:text-[#6f3bd2]">تواصل معنا</Link>
          <Link href="/login" className="min-h-11 inline-flex items-center hover:text-[#6f3bd2]">إدارة الاشتراك</Link>
        </nav>
      </div>
    </footer>
  );
}
