import Link from "next/link";

export function BookingSetupGuide({ subscriptionActive, hasServices, hasHours, bookingEnabled, published, audienceReady, whatsappReady, publicUrl }: {
  subscriptionActive: boolean; hasServices: boolean; hasHours: boolean; bookingEnabled: boolean;
  published: boolean; audienceReady: boolean; whatsappReady: boolean; publicUrl: string;
}) {
  const steps = [
    { title: "فعّل اشتراك المنشأة", done: subscriptionActive, href: "/dashboard/billing/manage?feature=appointments", detail: "الحجوزات متاحة ضمن الباقات التي تشمل المواعيد." },
    { title: "أضف الخدمات ومددها", done: hasServices, href: "/dashboard/services", detail: "فعّل خدمة واحدة على الأقل للحجز وحدد مدتها." },
    { title: "حدد أيام وساعات الاستقبال", done: hasHours, href: "#booking-weekly-hours", detail: "احفظ فترة عمل واحدة على الأقل؛ ثم اضبط سعة كل فرع." },
    { title: "اختر جمهور الحجز", done: audienceReady, href: "#booking-reception-settings", detail: audienceReady ? "شروط جمهور الحجز مضبوطة. يمكنك مراجعتها هنا." : "الحجز مقيد بطلبات المتاجر؛ اربط متجرًا نشطًا أو غيّر الجمهور." },
    { title: "افتح استقبال المواعيد", done: bookingEnabled, href: "#booking-reception-settings", detail: "فعّل الحجز بعد مراجعة الخدمات والأوقات." },
    { title: "انشر صفحة المنشأة", done: published, href: "/dashboard/digital-identity", detail: "انشر الصفحة، ثم افتح صفحة المنشأة واضغط «حجز موعد» لمراجعة تجربة العميل." },
  ];
  const done = steps.filter(step => step.done).length;
  const next = steps.find(step => !step.done);
  return <section className="booking-setup-guide rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="booking-setup-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="booking-setup-title" className="text-lg font-black">إعداد الحجز خطوة بخطوة</h2><p className="mt-2 text-sm leading-7 text-slate-600">{done} من {steps.length} إعدادات مكتملة. {next ? `الخطوة التالية: ${next.title}.` : "الإعدادات الأساسية مكتملة؛ راجع الأوقات المتاحة من صفحة الحجز."}</p></div><Link href={next?.href ?? publicUrl} className="inline-flex min-h-11 items-center rounded-xl bg-[#075c54] px-4 text-sm font-bold text-white">{next ? "إكمال الخطوة التالية" : "فتح صفحة المنشأة"}</Link></div>
    <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-slate-200 p-4"><span className="text-xs font-bold text-[#08756e]">{step.done ? "مكتمل" : `الخطوة ${index + 1}`}</span><h3 className="mt-2 text-sm font-bold"><Link href={step.href} className="underline underline-offset-4">{step.title}</Link></h3><p className="mt-2 text-xs leading-6 text-slate-600">{step.detail}</p></li>)}</ol>
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"><p className="flex-1 leading-7">تأكيدات واتساب اختيارية: {whatsappReady ? "تم ضبط رقم وقالب تأكيد متوافق. وصول الرسائل يُراجع من سجل الإرسال." : "يمكن إعداد رقم الحجوزات وقالب التأكيد بعد الخطوات الأساسية."}</p><Link href="#booking-whatsapp-settings" className="font-bold underline underline-offset-4">إعداد التأكيدات</Link><Link href="/dashboard/appointments/calendar" className="font-bold underline underline-offset-4">فتح التقويم</Link></div>
  </section>;
}
