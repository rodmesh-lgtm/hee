import { notFound } from "next/navigation";
import { isPreviewQaEnvironment } from "../../lib/qa-audit";
import { PublicServicesSection } from "../../../components/public/public-services-section";
import { PublicContactTeamSection } from "../../../components/public/public-contact-team-section";
import { PublicPortfolioSection } from "../../../components/public/public-portfolio-section";
import type { ContactTeamMember, PortfolioItem } from "../../lib/page-modules";
import type { PublicService } from "../../../components/public/types";

const serviceSeed: PublicService[] = [
  { id: "s1", name: "خدمة استشارية متقدمة", description: "تفاصيل مختصرة عن الخدمة الأولى.", price: 150, durationMinutes: 30, imageUrl: null, bookingEnabled: true, sortOrder: 0 },
  { id: "s2", name: "تركيب وصيانة", description: "خدمة عملية سريعة للمنزل أو المكتب.", price: 250, durationMinutes: 45, imageUrl: null, bookingEnabled: true, sortOrder: 1 },
  { id: "s3", name: "متابعة تشغيلية", description: "متابعة شهرية وتحسين الأداء.", price: 320, durationMinutes: 60, imageUrl: null, bookingEnabled: true, sortOrder: 2 },
  { id: "s4", name: "خدمة ميدانية متكاملة", description: "زيارة فنية مع تقرير مختصر.", price: 450, durationMinutes: 80, imageUrl: null, bookingEnabled: true, sortOrder: 3 },
  { id: "s5", name: "برنامج دعم موسع", description: "خدمة دعم مستمرة وفق الاشتراك.", price: 650, durationMinutes: 90, imageUrl: null, bookingEnabled: true, sortOrder: 4 },
  { id: "s6", name: "خدمة خاصة مخصصة", description: "حلول حسب الطلب للمشاريع الخاصة.", price: 900, durationMinutes: 120, imageUrl: null, bookingEnabled: true, sortOrder: 5 },
];

const salesSeed: ContactTeamMember[] = [
  { id: "tm1", name: "عبدالله الدوسري", title: "مبيعات", whatsapp: "966500000001", phone: "0555000001", email: "sales1@example.com", visible: true, sortOrder: 0 },
  { id: "tm2", name: "ليلى الحربي", title: "استشارات", whatsapp: "966500000002", phone: "0555000002", email: "sales2@example.com", visible: true, sortOrder: 1 },
  { id: "tm3", name: "Maha Al-Otaibi مها العتيبي", title: "Business Development", whatsapp: "966500000003", phone: "0555000003", email: "sales3@example.com", visible: true, sortOrder: 2 },
];

const supportSeed: ContactTeamMember[] = [
  { id: "cs1", name: "نورة الغامدي", title: "خدمة العملاء", whatsapp: "966500000011", phone: "0555000011", email: "support1@example.com", visible: true, sortOrder: 0 },
  { id: "cs2", name: "خالد اليامي", title: "الدعم", whatsapp: "966500000012", phone: "0555000012", email: "support2@example.com", visible: true, sortOrder: 1 },
  { id: "cs3", name: "سارة القحطاني", title: "المتابعة", whatsapp: "966500000013", phone: "0555000013", email: "support3@example.com", visible: true, sortOrder: 2 },
];

const portfolioSeed: PortfolioItem[] = [
  { id: "p1", title: "مشروع أول", description: "وصف قصير للعمل الأول", imageUrl: "", url: "", visible: true, sortOrder: 0 },
  { id: "p2", title: "مشروع ثانٍ طويل العنوان لاختبار الالتفاف", description: "وصف إضافي للعمل الثاني", imageUrl: "https://dummyimage.com/900x600/eef6ff/1f2552&text=P2", url: "https://example.com/p2", visible: true, sortOrder: 1 },
  { id: "p3", title: "مشروع ثالث", description: "عرض صورة ونص ورابط خارجي", imageUrl: "https://dummyimage.com/900x600/fff7e6/1f2552&text=P3", url: "https://example.com/p3", visible: true, sortOrder: 2 },
];

export default function QaComponentLabPage() {
  if (!isPreviewQaEnvironment()) {
    notFound();
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#f4f7ff_0%,#eef3ff_100%)] p-4 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-black text-[#1f2552]">QA - مكونات الملف التجاري</h1>
          <p className="text-sm text-slate-600">سطح تحقق preview-only لتوازن الشبكات والحالات 1..N بدون المساس ببيانات العملاء.</p>
        </header>

        <section className="space-y-4 rounded-2xl border border-[#e4e9f7] bg-white p-4">
          <h2 className="text-lg font-black text-[#253062]">خدمات 1..6</h2>
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <div key={count} id={`services-${count}`} className="space-y-2">
              <p className="text-sm font-bold text-slate-600">{count} خدمات</p>
              <PublicServicesSection services={serviceSeed.slice(0, count)} accentColor="#0f766e" whatsapp="966500000001" businessName="مختبر الخدمات" title={`مجموعة ${count}`} />
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-2xl border border-[#e4e9f7] bg-white p-4">
          <h2 className="text-lg font-black text-[#253062]">فريق التواصل 1..3</h2>
          {[1, 2, 3].map((count) => (
            <div key={count} id={`team-${count}`} className="space-y-2">
              <p className="text-sm font-bold text-slate-600">{count} عضو</p>
              <PublicContactTeamSection salesTeam={salesSeed.slice(0, count)} customerServiceTeam={supportSeed.slice(0, count)} />
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-2xl border border-[#e4e9f7] bg-white p-4">
          <h2 className="text-lg font-black text-[#253062]">أعمالنا 1..3</h2>
          {[1, 2, 3].map((count) => (
            <div key={count} id={`portfolio-${count}`} className="space-y-2">
              <p className="text-sm font-bold text-slate-600">{count} عنصر</p>
              <PublicPortfolioSection items={portfolioSeed.slice(0, count)} />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
