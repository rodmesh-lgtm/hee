import { BadgeCheck, Users2, UserRoundSearch } from "lucide-react";
import { DashboardSectionPage } from "../../../components/dashboard/dashboard-section-page";

export default function DashboardCustomersPage() {
  return (
    <DashboardSectionPage
      breadcrumbs={[{ label: "لوحة التحكم", href: "/dashboard" }, { label: "العملاء" }]}
      title="العملاء"
      description="إدارة قاعدة العملاء، متابعة التفاعل، وتنظيم الشرائح التسويقية حسب السلوك الشرائي."
      actionLabel="عرض العروض"
      actionHref="/dashboard/offers"
      emptyStateTitle="لا توجد بيانات عملاء بعد"
      emptyStateDescription="ستظهر بيانات العملاء تلقائياً عند وجود طلبات أو تسجيلات جديدة داخل المنصة."
      primaryActionLabel="فتح لوحة التحكم"
      primaryActionHref="/dashboard"
      secondaryActionLabel="فتح العروض"
      secondaryActionHref="/dashboard/offers"
      cards={[
        { title: "الشرائح", description: "مخصصة للعملاء المخلصين والجدد.", icon: Users2 },
        { title: "الملفات", description: "سجل العميل مع الملاحظات وتاريخ التعامل.", icon: BadgeCheck },
        { title: "البحث", description: "مساحة للاستكشاف والتصفية السريعة.", icon: UserRoundSearch },
      ]}
    />
  );
}
