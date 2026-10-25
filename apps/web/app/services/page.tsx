import Link from "next/link";
import {ServiceDetails} from "../../components/service-details";
export const metadata={title:"خدمات INFRO | الكاشير والمحاسبة وواتساب والبث",description:"تفاصيل باقات INFRO وخدمات المحاسبة واشتراكات العملاء وحملات واتساب والمشاهدة المؤقتة للكاميرات."};
export default function Services(){return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><nav className="mx-auto flex max-w-6xl flex-wrap gap-5"><Link className="min-h-11 font-black text-teal-700" href="/">INFRO · الرئيسية</Link><Link className="min-h-11 underline" href="/#pricing">الباقات والأسعار</Link><Link className="min-h-11 underline" href="/dashboard/plans">باقات حسابك</Link></nav><ServiceDetails/></main>;}
