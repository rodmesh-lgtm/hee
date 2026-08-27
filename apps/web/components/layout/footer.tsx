import Link from "next/link";
import { Globe2, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { IrLogo } from "../brand/ir-logo";
import { Container } from "../shared/container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <Container className="grid gap-8 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <IrLogo className="h-12 w-12" />
            <div>
              <div className="text-lg font-black text-slate-950 dark:text-white">iR</div>
              <div className="text-xs font-bold text-violet-700 dark:text-violet-300">هوية أعمال رقمية</div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            منصة هوية أعمال رقمية تساعد المنشآت على تقديم معلوماتها وخدماتها وفروعها وفريقها ووسائل التواصل في صفحة احترافية واحدة على ir.sa.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">روابط سريعة</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li><Link href="/#features" className="hover:text-violet-700">المزايا</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-violet-700">كيف تعمل</Link></li>
            <li><Link href="/#pricing" className="hover:text-violet-700">الأسعار</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">تواصل</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> السعودية</div>
            <a className="flex items-center gap-2 hover:text-violet-700" href="mailto:support@ir.sa"><MessageCircle className="h-4 w-4" /> support@ir.sa</a>
            <a className="flex items-center gap-2 hover:text-violet-700" href="https://ir.sa" target="_blank" rel="noreferrer"><Globe2 className="h-4 w-4" /> ir.sa</a>
            <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> دعم رقمي من خلال المنصة</span>
          </div>
        </div>
      </Container>

      <div className="border-t border-slate-200 py-4 dark:border-slate-800">
        <Container className="flex flex-col items-center justify-between gap-3 text-sm text-slate-500 md:flex-row dark:text-slate-400">
          <span>© 2026 iR. جميع الحقوق محفوظة.</span>
          <span className="inline-flex items-center gap-2">
            <Send className="h-4 w-4" />
            هوية أعمال رقمية على ir.sa
          </span>
        </Container>
      </div>
    </footer>
  );
}
