import { Clock3, FileText, ShoppingCart, Users2 } from "lucide-react";
import { Card } from "../ui/card";
import type { LucideIcon } from "lucide-react";

type ActivityItem = {
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
};

const defaultItems: ActivityItem[] = [
  { title: "تم نشر النشاط", description: "تم تجهيز صفحة النشاط للعملاء.", time: "قبل دقيقتين", icon: FileText },
  { title: "مراجعة المنتجات", description: "تم تحديث تصنيف المنتجات واعتماد التعديلات الأخيرة.", time: "قبل 18 دقيقة", icon: ShoppingCart },
  { title: "مزامنة العملاء", description: "تم تجهيز مساحة إدارة العملاء داخل الواجهة.", time: "قبل ساعة", icon: Users2 },
];

export function RecentActivity({ items = defaultItems }: { items?: ActivityItem[] }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-white">آخر الأنشطة</h3>
          <p className="mt-1 text-sm text-slate-400">آخر ما جرى داخل مساحة العمل</p>
        </div>
        <Clock3 className="h-4 w-4 text-slate-500" />
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-200">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{item.title}</p>
                  <span className="text-xs text-slate-500">{item.time}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
