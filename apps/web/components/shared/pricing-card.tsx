import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";

type PricingCardProps = {
  title: string;
  price: string;
  description: string;
  featured?: boolean;
  features: string[];
  className?: string;
};

export function PricingCard({
  title,
  price,
  description,
  featured = false,
  features,
  className,
}: PricingCardProps) {
  return (
    <Card
      hoverLift={!featured}
      className={cn(
        "flex h-full flex-col justify-between border-slate-200/80 dark:border-slate-800",
        featured && "border-indigo-400 bg-gradient-to-b from-indigo-600 to-indigo-700 text-white",
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn("text-xl font-black", featured ? "text-white" : "text-slate-950 dark:text-white")}>{title}</h3>
          {featured ? <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">الأكثر طلباً</span> : null}
        </div>
        <p className={cn("mt-3 text-sm", featured ? "text-indigo-100" : "text-slate-500 dark:text-slate-300")}>{description}</p>
        <div className="mt-6 text-4xl font-black">
          <span className={featured ? "text-white" : "text-slate-950 dark:text-white"}>{price}</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm">
            <Check className={cn("h-4 w-4", featured ? "text-white" : "text-emerald-600 dark:text-emerald-300")} />
            <span className={featured ? "text-indigo-50" : "text-slate-700 dark:text-slate-100"}>{feature}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
