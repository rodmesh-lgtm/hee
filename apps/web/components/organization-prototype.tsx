"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, ChevronRight, CirclePlus, Compass, Headset, Plus, Sparkles, Users, Wand2 } from "lucide-react";
import { useState } from "react";

const entityOptions = ["مؤسسة", "شركة", "مكتب", "نشاط فردي", "أخرى"];
const businessCategories = ["تجارة", "خدمات", "مطاعم ومقاهي", "صحة وعيادات", "عقار", "سيارات", "مقاولات", "تقنية", "تعليم وتدريب", "تجميل وعناية", "خدمات مهنية", "أخرى"];
const groupTypes = ["شركة قابضة", "مجموعة شركات", "مجموعة علامات تجارية", "أخرى"];

export function AccountTypeSelectionPrototype({
  onSelect,
  selected,
}: {
  onSelect: (value: "single" | "group") => void;
  selected?: "single" | "group" | null;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 text-right">
      <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" />
          تجربة UX أولية
        </div>
        <h1 className="mt-4 text-3xl font-black text-slate-900">كيف ستستخدم HEE؟</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">سنجهز لك التجربة المناسبة، ويمكنك تعديل هذه الخيارات لاحقاً.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("single")}
            className={`rounded-[24px] border p-5 text-right transition ${selected === "single" ? "border-emerald-500 bg-emerald-500/10 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-emerald-300"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black text-slate-900">نشاط واحد</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">أنشئ صفحة واحدة لنشاطك.</p>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-500">مؤسسة، شركة، مكتب، متجر أو نشاط مستقل</p>
          </button>

          <button
            type="button"
            onClick={() => onSelect("group")}
            className={`rounded-[24px] border p-5 text-right transition ${selected === "group" ? "border-emerald-500 bg-emerald-500/10 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-emerald-300"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black text-slate-900">مجموعة أعمال</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">أدر عدة شركات وصفحات من حساب واحد.</p>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-500">شركة قابضة، مجموعة شركات أو عدة علامات تجارية</p>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/demo" className="text-sm font-bold text-slate-500">عرض جميع المسارات التجريبية</Link>
          <button type="button" disabled={!selected} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            متابعة
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SingleBusinessOnboardingPrototype() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [entity, setEntity] = useState("مؤسسة");
  const [category, setCategory] = useState("خدمات");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 text-right">
      <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </button>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-700">نشاط واحد</div>
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-900">عرّفنا بنشاطك</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">اختيار بسيط لبدء الصفحة دون تعقيد.</p>

        {!submitted ? (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">اسم النشاط</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right text-slate-900" placeholder="مثال: بيت القهوة" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">نوع الكيان</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {entityOptions.map((option) => (
                  <button key={option} type="button" onClick={() => setEntity(option)} className={`rounded-2xl border px-3 py-2 text-sm font-bold ${entity === option ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}>
                    {option}
                  </button>
                ))}
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">مجال النشاط</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {businessCategories.map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-2xl border px-3 py-2 text-sm font-bold ${category === item ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </label>

            <button type="button" onClick={() => setSubmitted(true)} disabled={!name.trim()} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              إنشاء الصفحة
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-lg font-black">تمت جاهزية النموذج</p>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-700">سيظهر هذا النشاط في لوحة الإدارة كصفحة جديدة جاهزة للإدارة.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">لوحة النشاط</Link>
              <Link href="/demo/company-switcher" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700">عرض تبديل الشركات</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BusinessGroupOnboardingPrototype() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("شركة قابضة");
  const [created, setCreated] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 text-right">
      <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </button>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-700">مجموعة أعمال</div>
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-900">أنشئ مجموعتك</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">ستتمكن من إضافة شركات المجموعة وإدارة صفحاتها من مكان واحد.</p>

        {!created ? (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">اسم المجموعة</span>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right text-slate-900" placeholder="مثال: مجموعة النمو" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">نوع المجموعة</span>
              <select value={groupType} onChange={(e) => setGroupType(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right text-slate-900">
                {groupTypes.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">شعار المجموعة (اختياري)</div>
            <button type="button" onClick={() => setCreated(true)} disabled={!groupName.trim()} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              إنشاء المجموعة
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-lg font-black">أهلاً بك في {groupName}</p>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-700">ابدأ بإضافة أول شركة أو علامة تجارية إلى مجموعتك.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/demo/add-company" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">+ إضافة شركة</Link>
              <Link href="/demo/public-group" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700">معاينة صفحة المجموعة</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function GroupDashboardPrototype() {
  const companies = [
    { name: "شركة ألف", category: "تجارة", status: "منشورة", members: 2, teams: 6 },
    { name: "شركة باء", category: "خدمات", status: "منشورة", members: 3, teams: 4 },
    { name: "شركة جيم", category: "عقار", status: "مسودة", members: 1, teams: 2 },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 text-right">
      <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900">مجموعة النمو القابضة</p>
              <p className="text-sm text-slate-600">شركة قابضة / مجموعة أعمال</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/demo/add-company" className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-black text-white">+ إضافة شركة</Link>
            <Link href="/demo/public-group" className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-700">عرض صفحة المجموعة</Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {companies.map((company) => (
            <div key={company.name} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-900">{company.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{company.category}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${company.status === "منشورة" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                  {company.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                {company.teams ? <span className="rounded-full bg-white px-2.5 py-1">{company.teams} فرق</span> : null}
                {company.members ? <span className="rounded-full bg-white px-2.5 py-1">{company.members} أعضاء</span> : null}
              </div>
              <div className="mt-4 flex gap-2">
                <Link href="/demo/company-switcher" className="flex-1 rounded-2xl bg-slate-900 px-3 py-2 text-center text-sm font-black text-white">إدارة</Link>
                <Link href="/demo/public-group" className="flex-1 rounded-2xl border border-slate-300 px-3 py-2 text-center text-sm font-black text-slate-700">عرض الصفحة</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AddCompanyPrototype() {
  const [name, setName] = useState("");
  const [entity, setEntity] = useState("شركة");
  const [category, setCategory] = useState("خدمات");
  const [added, setAdded] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 text-right">
      <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-slate-900">إضافة شركة</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">كل شركة تحصل على صفحة HEE مستقلة Conceptually.</p>
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-700">إضافة</div>
        </div>

        {!added ? (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">اسم الشركة</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right text-slate-900" placeholder="مثال: شركة ألف" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">نوع الكيان</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {entityOptions.map((option) => (
                  <button key={option} type="button" onClick={() => setEntity(option)} className={`rounded-2xl border px-3 py-2 text-sm font-bold ${entity === option ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}>
                    {option}
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">مجال النشاط</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {businessCategories.slice(0, 8).map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-2xl border px-3 py-2 text-sm font-bold ${category === item ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <button type="button" onClick={() => setAdded(true)} disabled={!name.trim()} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              إضافة الشركة
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-lg font-black text-slate-900">تمت إضافة الشركة بنجاح</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">ستظهر الشركة الآن ضمن المجموعة مع صفحة أعمال مستقلة في المستقبل.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/demo/group-dashboard" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">العودة إلى الشركات</Link>
              <Link href="/demo/company-switcher" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700">إدارة الشركة</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CompanySwitcherPrototype() {
  const router = useRouter();
  const companies = ["شركة ألف", "شركة باء", "شركة جيم"];
  const [activeCompany, setActiveCompany] = useState("شركة ألف");

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-right">
      <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-slate-900">أنت تدير الآن</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">تبديل بسيط بين الشركات دون تغيير بنية لوحة الإدارة الحالية.</p>
          </div>
          <button type="button" onClick={() => router.back()} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">رجوع</button>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">المنطقة الحالية</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {companies.map((company) => (
              <button key={company} type="button" onClick={() => setActiveCompany(company)} className={`rounded-2xl border px-3 py-2 text-sm font-bold ${activeCompany === company ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}>
                {company}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
            <p className="text-lg font-black text-slate-900">{activeCompany}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">يمكن إعادة استخدام نفس صفحة إدارة النشاط الحالية مع سياق مختلف لكل شركة.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/demo/subsidiary-team" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">فريق التواصل</Link>
              <Link href="/dashboard" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-700">اللوحة الحالية</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicGroupPrototype() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 text-right">
      <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              صفحة مجموعة عامة
            </div>
            <h1 className="mt-3 text-2xl font-black text-slate-900">مجموعة النمو القابضة</h1>
            <p className="mt-2 text-sm leading-7 text-slate-600">بوابة بسيطة لشركات المجموعة مع صفحة واحدة لكل شركة.</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700">شركات المجموعة</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-700">3 شركات</span>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {[
              { name: "شركة ألف", category: "تجارة", description: "علامة تجارية موجهة للمبيعات" },
              { name: "شركة باء", category: "خدمات", description: "خدمات احترافية" },
              { name: "شركة جيم", category: "عقار", description: "مكاتب وعقارات" },
            ].map((company) => (
              <div key={company.name} className="min-w-[220px] rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-base font-black text-slate-900">{company.name}</p>
                <p className="mt-1 text-sm text-slate-600">{company.category}</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">{company.description}</p>
                <button type="button" className="mt-4 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-black text-white">زيارة الشركة</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubsidiaryTeamPrototype() {
  const departments = [
    { name: "المبيعات", members: 3, accent: "emerald" },
    { name: "خدمة العملاء", members: 2, accent: "sky" },
    { name: "الحجوزات", members: 1, accent: "amber" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-right">
      <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-slate-900">فريق التواصل</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">كل شركة تمتلك فرقها الخاصة دون مشاركة تلقائية مع الشركات الأخرى.</p>
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-700">شركة ألف</div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {departments.map((department) => (
            <div key={department.name} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-black text-slate-900">{department.name}</p>
                <div className={`rounded-full px-2.5 py-1 text-[11px] font-black ${department.accent === "emerald" ? "bg-emerald-500/10 text-emerald-700" : department.accent === "sky" ? "bg-sky-500/10 text-sky-700" : "bg-amber-500/10 text-amber-700"}`}>
                  {department.members} أعضاء
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {department.name === "المبيعات" ? (
                  <><div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">أحمد · مبيعات الشركات</div><div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">سالم · عروض وأسعار</div></>
                ) : department.name === "خدمة العملاء" ? (
                  <><div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">سارة · خدمة العملاء</div><div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">نورة · متابعة الطلبات</div></>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">ليلى · الحجوزات</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
