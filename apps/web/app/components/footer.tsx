import { ArrowUpRight, Globe2, MapPin, MessageCircle, Phone, Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        <div className="text-right">
          <div className="text-2xl font-black text-slate-950">HEE</div>
          <p className="mt-4 max-w-xs text-sm leading-7 text-slate-600">
            منصة عربية جاهزة لإدارة النشاط التجاري عبر واجهة احترافية وتفاعل مباشر مع العملاء.
          </p>
        </div>

        <div className="text-right">
          <h3 className="text-sm font-black text-slate-900">روابط سريعة</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li><a href="#home" className="hover:text-indigo-700">الرئيسية</a></li>
            <li><a href="#features" className="hover:text-indigo-700">المزايا</a></li>
            <li><a href="#pricing" className="hover:text-indigo-700">الأسعار</a></li>
          </ul>
        </div>

        <div className="text-right">
          <h3 className="text-sm font-black text-slate-900">التواصل</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex items-center justify-end gap-2"><Phone className="h-4 w-4" /> 055 000 0000</li>
            <li className="flex items-center justify-end gap-2"><MessageCircle className="h-4 w-4" /> واتساب</li>
            <li className="flex items-center justify-end gap-2"><MapPin className="h-4 w-4" /> الرياض، السعودية</li>
          </ul>
        </div>

        <div className="text-right">
          <h3 className="text-sm font-black text-slate-900">تابعنا</h3>
          <div className="mt-4 flex justify-end gap-3">
            <a href="#" className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700">
              <Globe2 className="h-4 w-4" />
            </a>
            <a href="#" className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700">
              <Send className="h-4 w-4" />
            </a>
            <a href="#" className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700">
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
