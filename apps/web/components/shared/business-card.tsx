import type { ReactNode } from "react";
import { ArrowUpRight, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { VerifiedBadge } from "../ui/verified-badge";

type BusinessCardProps = {
  logo: string;
  name: string;
  specialty: string;
  location: string;
  products: string[];
  offers?: string[];
  children?: ReactNode;
  className?: string;
};

export function BusinessCard({
  logo,
  name,
  specialty,
  location,
  products,
  offers,
  children,
  className,
}: BusinessCardProps) {
  return (
    <Card className={cn("space-y-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
            {logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">{name}</h3>
              <VerifiedBadge />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-300">{specialty}</p>
          </div>
        </div>
        <Badge>WhatsApp</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
            <MapPin className="h-4 w-4" />
            الموقع
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-100">{location}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
            <Phone className="h-4 w-4" />
            تواصل
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-100">+966 50 000 0000</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
          <Store className="h-4 w-4" />
          المنتجات
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {products.map((item) => (
            <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-100">
              {item}
            </span>
          ))}
        </div>
      </div>

      {offers && offers.length > 0 ? (
        <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-200">
            <MessageCircle className="h-4 w-4" />
            عروض
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {offers.map((offer) => (
              <span key={offer} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-100">
                {offer}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {children ? <div className="flex items-center justify-between">{children}</div> : null}

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          حجز سريع
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-200">
          التفاصيل
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
