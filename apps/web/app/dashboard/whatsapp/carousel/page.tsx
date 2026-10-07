import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext, roleCan } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { WorkspaceHeading, WorkspaceEmpty } from "../_components/workspace-ui";
import { CarouselEditor } from "./carousel-editor";
export default async function CarouselPage() {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const connections = await db.whatsAppConnection.findMany({ where: { businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true }, select: { id: true, displayPhoneNumber: true }, orderBy: { createdAt: "asc" } });
  return <div className="wa-page" dir="rtl"><WorkspaceHeading eyebrow="عرض منتجاتك" title="كاروسيل منتجات واتساب" description="بطاقات منتجات قابلة للتصفح داخل واتساب، مرتبطة بكتالوج Meta والقوالب المعتمدة." action={<Link className="wa-button wa-secondary" href="/dashboard/whatsapp/templates">مكتبة القوالب</Link>}/>{!connections.length ? <WorkspaceEmpty title="اربط رقمًا رسميًا أولًا" description="تحتاج إلى اتصال Meta مفعّل للتسويق وكتالوج مرتبط بحساب واتساب."/> : roleCan(context.role, "campaign.manage") ? <CarouselEditor connections={connections.map(c => ({ id: c.id, label: c.displayPhoneNumber ?? c.id }))}/> : <p className="wa-notice">إنشاء القالب يتطلب صلاحية إدارة الحملات.</p>}</div>;
}
