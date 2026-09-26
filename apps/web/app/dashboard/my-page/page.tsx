import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";
import { getOwnedBusinessForRead } from "../../lib/ownership";
import { normalizePageModules, type PageModuleId } from "../../lib/page-modules";
import { SimpleBusinessEditor } from "../../../components/dashboard/simple-business-editor";
import { PageSectionOrderEditor } from "../../../components/dashboard/page-section-order-editor";
import { BottomActionBarEditor } from "../../../components/dashboard/bottom-action-bar-editor";
import { updateBookingAvailabilityAction } from "../../actions/services";

const managedIds = new Set<PageModuleId>(["request", "services", "portfolio", "location", "contactTeam", "hours", "contact", "about"]);

type ManagedId = Extract<PageModuleId, "request" | "services" | "portfolio" | "location" | "contactTeam" | "hours" | "contact" | "about">;

export default async function DashboardMyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusiness = await getOwnedBusinessForRead();
  if (!activeBusiness) redirect("/onboarding");

  const business = await db.business.findFirst({
    where: { id: activeBusiness.id, ownerId: activeBusiness.ownerId, deletedAt: null },
    include: {
      services: { where: { isActive: true, deletedAt: null } },
      branches: { where: { isActive: true } },
      contactPersons: { where: { isActive: true } },
      openingHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!business) redirect("/onboarding");
  const effectivelyPublished = Boolean(business.isPublished && user.emailVerifiedAt);
  const moduleOrder = normalizePageModules(business.pageModules, business.businessType)
    .filter((module): module is typeof module & { id: ManagedId } => managedIds.has(module.id))
    .map((module) => module.id);
  const bookableServices = business.services.filter((service) => service.bookingEnabled).length;
  const openDays = business.openingHours.filter((day) => !day.isClosed && day.opensAt && day.closesAt).length;
  const bookingReady = business.bookingAvailable && bookableServices > 0 && openDays > 0;

  return <div className="space-y-5">
    <SimpleBusinessEditor business={{
      name: business.name,
      businessType: business.businessType,
      shortDescription: business.shortDescription ?? "",
      description: business.description ?? "",
      phone: business.phone ?? "",
      whatsapp: business.whatsapp ?? "",
      city: business.city ?? "",
      district: business.district ?? "",
      googleMapsLink: business.googleMapsLink ?? "",
      isPublished: effectivelyPublished,
      slug: business.slug,
    }} serviceCount={business.services.length} branchCount={business.branches.length} contactCount={business.contactPersons.length} />
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white" dir="rtl">
      <div className="grid gap-5 bg-[linear-gradient(135deg,#07181b,#0b3034)] p-5 text-white sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#5cebd7]/10 text-[#5cebd7]"><CalendarClock className="h-5 w-5" /></span><div><span className="text-[9px] font-black tracking-[.16em] text-[#5cebd7]" dir="ltr">02 · APPOINTMENTS</span><h2 className="mt-1 text-xl font-black">الحجز اختياري في كل قوالب العملاء</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">فعّله لأي نشاط عند الحاجة. لن يظهر للزائر إلا بعد وجود خدمة قابلة للحجز ووقت متاح، ولن نعرض له السعة المتبقية.</p></div></div>
        <span className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 text-xs font-black ${bookingReady?"border-emerald-300/30 bg-emerald-300/10 text-emerald-200":"border-white/10 bg-white/[.05] text-slate-300"}`}>{bookingReady?<CheckCircle2 className="h-4 w-4"/>:<Circle className="h-4 w-4"/>}{bookingReady?"جاهز ويظهر للعملاء":business.bookingAvailable?"مفعّل ويحتاج إكمال الإعداد":"غير مفعّل"}</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <form action={updateBookingAvailabilityAction} className="grid gap-2 min-[430px]:grid-cols-[1fr_auto]"><label className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-[#f8fbfb] px-3 text-xs font-black text-slate-700"><span>{business.bookingAvailable?"الحجز مفعّل لهذه الصفحة":"إضافة الحجز لهذه الصفحة"}</span><input type="checkbox" name="bookingAvailable" defaultChecked={business.bookingAvailable} className="h-5 w-5 accent-[#00a99d]" /></label><button className="min-h-12 rounded-xl bg-[#07181b] px-5 text-xs font-black text-white">حفظ الظهور</button></form>
        <Link href="/dashboard/working-hours" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#bdebe5] bg-[#effbf9] px-4 text-xs font-black text-[#08756e]">ضبط الجدول والسعة <ArrowLeft className="h-4 w-4" /></Link>
      </div>
    </section>
    <PageSectionOrderEditor initialOrder={moduleOrder} />
    <BottomActionBarEditor initialServiceRequestEnabled={normalizePageModules(business.pageModules,business.businessType).find(module=>module.id==="contact")?.config.serviceRequestEnabled} initialBookingPlacement={normalizePageModules(business.pageModules,business.businessType).find(module=>module.id==="contact")?.config.bookingPlacement} initialActions={normalizePageModules(business.pageModules, business.businessType).find((module) => module.id === "contact")?.config.bottomActions} />
  </div>;
}
