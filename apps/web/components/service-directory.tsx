"use client";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Calculator, MessageCircle, Video } from "lucide-react";
import { SERVICE_GUIDES } from "../app/lib/service-guides";
import { useI18n } from "./i18n/locale-provider";
const icons=[BadgeCheck,Calculator,MessageCircle,Video];
export function ServiceDirectory({compact=false}:{compact?:boolean}){
 const {t,dir}=useI18n();
 const Heading=compact?"h2":"h1";
 return <section id="our-services" dir={dir} aria-labelledby="service-directory-title" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-12 sm:px-6 sm:py-16"><header className="max-w-3xl"><p className="text-sm font-bold text-teal-700">{t("من التعريف بنشاطك إلى تشغيله وتنميته")}</p><Heading id="service-directory-title" className="mt-3 text-3xl font-black leading-tight">{t("خدمات مترابطة. اختر ما يخدم نشاطك.")}</Heading><p className="mt-4 text-sm leading-8 text-slate-600">{t("ابدأ بهوية مجانية، ثم أضف التشغيل أو المواعيد أو واتساب أو المشاهدة المباشرة، منفردة أو ضمن باقة.")}</p></header><div className="mt-8 grid gap-4 md:grid-cols-2">{SERVICE_GUIDES.map((service,index)=>{const Icon=icons[index];return <article key={service.slug} className="flex flex-col rounded-3xl border border-teal-100 bg-white p-6 shadow-sm"><Icon className="h-8 w-8 text-teal-700" aria-hidden="true"/><p className="mt-5 text-xs font-bold text-teal-700">{t(service.eyebrow)}</p><h3 className="mt-2 text-xl font-black">{t(service.name)}</h3><p className="mt-3 text-sm leading-8 text-slate-600">{t(service.summary)}</p>{!compact?<p className="mt-3 text-sm leading-7 text-slate-500">{t(service.audience)}</p>:null}<Link className="mt-auto inline-flex min-h-12 items-center gap-3 pt-5 text-sm font-black text-teal-800 underline-offset-4 hover:underline" href={`/services/${service.slug}`}>{t("المزايا وطريقة التفعيل")}<ArrowLeft className="h-4 w-4 ltr:rotate-180" aria-hidden="true"/></Link></article>})}</div></section>;
}
