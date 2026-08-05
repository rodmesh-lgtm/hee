import { Settings2, ShieldCheck } from "lucide-react";
import { Card } from "../../../components/ui/card";

export default function DashboardSettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="space-y-3 bg-slate-950/75" hoverLift={false}>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">
          <Settings2 className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-black text-white">الحساب / الإعدادات</h1>
        <p className="text-sm text-slate-300">مساحة مخصصة لإعدادات الحساب والباقة ومستوى الأمان.</p>
      </Card>

      <Card className="space-y-3 bg-slate-950/75" hoverLift={false}>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          قريباً
        </div>
        <p className="text-sm text-slate-300">سيتم توسيع هذه الصفحة لاحقاً لتشمل تفاصيل الاشتراك والأمان بشكل أبسط للعملاء.</p>
      </Card>
    </div>
  );
}
