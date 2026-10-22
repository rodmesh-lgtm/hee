import type { Metadata } from "next";
import { getWatchSession } from "../../lib/live-view/access";
import { LivePlayer } from "./player";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "متابعة خدمتك | INFRO", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };
export default async function WatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getWatchSession(token).catch(() => null);
  return <main dir="rtl" className="min-h-screen bg-[#081f22] px-4 py-8 text-white sm:px-8 sm:py-12"><div className="mx-auto max-w-4xl"><header className="mb-8 flex items-center justify-between gap-4"><b className="text-xl tracking-widest text-teal-200">INFRO <span className="text-xs font-normal tracking-normal text-slate-400">LIVE</span></b><span className="rounded-full border border-white/15 px-3 py-2 text-xs text-slate-300">رابط خاص ومؤقت</span></header>{session ? <><p className="text-sm text-teal-200">{session.business.name}</p><h1 className="mt-3 text-2xl font-black sm:text-3xl">تابع خدمتك، أينما كنت.</h1><p className="mb-6 mt-3 text-sm leading-7 text-slate-400">{session.station.name} · {session.station.location}</p><LivePlayer token={token} expiresAt={session.expiresAt.toISOString()} /><p className="mt-5 text-sm leading-8 text-slate-400">تنتهي المشاهدة عند إغلاق الجلسة أو انتهاء المدة المحددة. احتفظ بالرابط لنفسك؛ مشاركته تمنح الآخرين حق المشاهدة.</p></> : <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center sm:p-16"><h1 className="text-2xl font-black">رابط المشاهدة غير متاح</h1><p className="mt-4 text-sm leading-8 text-slate-400">قد تكون الخدمة انتهت أو أُغلق الوصول. تواصل مع مقدم الخدمة إذا كنت تحتاج المساعدة.</p></section>}<footer className="mt-10 border-t border-white/10 pt-5 text-xs text-slate-500">المتابعة المباشرة مقدمة عبر INFRO · انفرو</footer></div></main>;
}
