import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import { Card } from "../../../components/ui/card";

export default function DashboardReviewsPage() {
  return (
    <div className="space-y-6">
      <Card className="space-y-3 bg-slate-950/75" hoverLift={false}>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">
          <MessageSquareQuote className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-black text-white">التقييمات</h1>
        <p className="text-sm leading-7 text-slate-300">وحدة التقييمات غير مفعلة في مخطط البيانات الحالي، لذلك لا يمكن عرض تقييمات فعلية في هذه المرحلة.</p>
      </Card>

      <Card className="space-y-3 border-dashed bg-slate-950/75" hoverLift={false}>
        <p className="text-sm text-slate-300">عند إضافة نموذج تقييمات رسمي داخل النظام سيتم ربط هذه الصفحة مباشرة بالبيانات الفعلية.</p>
        <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white">العودة إلى الرئيسية</Link>
      </Card>
    </div>
  );
}
