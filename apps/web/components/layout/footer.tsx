import Link from "next/link";
import { ArrowUpRight, Globe2, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Container } from "../shared/container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <Container className="grid gap-8 py-10 md:grid-cols-3">
        <div>
          <div className="text-lg font-black text-slate-950 dark:text-white">HEE</div>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            منصة احترافية لإدارة النشاط التجاري، إظهار المنتجات، وربط العملاء من لوحة موحدة.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">روابط سريعة</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li><Link href="/#features" className="hover:text-indigo-700">المزايا</Link></li>
            <li><Link href="/#business-types" className="hover:text-indigo-700">الأنواع</Link></li>
            <li><Link href="/#pricing" className="hover:text-indigo-700">الأسعار</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">تواصل</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> الرياض، السعودية</div>
            <a className="flex items-center gap-2 hover:text-indigo-700" href="tel:+966550000000"><Phone className="h-4 w-4" /> +966 55 000 0000</a>
            <a className="flex items-center gap-2 hover:text-indigo-700" href="mailto:support@hee.sa"><MessageCircle className="h-4 w-4" /> support@hee.sa</a>
            <a className="flex items-center gap-2 hover:text-indigo-700" href="https://hee.sa" target="_blank" rel="noreferrer"><Globe2 className="h-4 w-4" /> hee.sa</a>
          </div>
        </div>
      </Container>

      <div className="border-t border-slate-200 py-4 dark:border-slate-800">
        <Container className="flex flex-col items-center justify-between gap-3 text-sm text-slate-500 md:flex-row dark:text-slate-400">
          <span>© 2026 HEE. جميع الحقوق محفوظة.</span>
          <span className="inline-flex items-center gap-2">
            <Send className="h-4 w-4" />
            Built for modern businesses
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Container>
      </div>
    </footer>
  );
}
