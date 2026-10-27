export function WindowsConnectorSetup(){
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900" dir="rtl">
    <h2 className="font-black">ربط كاميرات الفرع من Windows</h2>
    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
      <p className="text-sm font-bold">برنامج INFRO للويندوز — نسخة تجربة ميدانية 0.2.1</p>
      <p className="mt-2 text-sm leading-8">نزّل الملف وفك الضغط، ثم افتح INFRO-Connector-Setup-internal.exe. للتثبيت الأول افتح البرنامج وجهّز أدوات البث ثم أدخل رمز اقتران الفرع. عند التحديث يبقى الاقتران المحفوظ؛ اضغط تشغيل الخدمة بعد اكتمال الاقتران. تبقى إضافة الكاميرات وروابط العملاء داخل حسابك.</p>
      <a href="/downloads/infro-connector-windows-pilot-0.2.1.zip" download className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#087e78] px-5 text-sm font-bold text-white">تنزيل برنامج INFRO للويندوز — تجريبي</a>
      <p className="mt-3 text-xs leading-7">Windows ‏64 بت، مع صلاحية تثبيت البرامج واتصال بالإنترنت. الخدمة مهيأة للبدء مع Windows؛ تحقق من وصول الصورة فعليًا بعد إعادة تشغيل جهاز الفرع.</p>
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-7 text-amber-950">هذه النسخة غير موقّعة رقميًا ومخصصة للاختبار تحت إشراف الدعم. إذا منع Windows تشغيلها، توقف وشارك صورة التحذير مع الدعم دون تجاوزه. نجاح التثبيت أو الاقتران لا يعني أن بث الكاميرا جاهز.</p>
    </div>
    <details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-bold">الإعداد اليدوي السابق — للمستخدم المتقدم والدعم</summary>
    <p className="mt-3 text-sm leading-8 text-slate-600">استخدم جهازًا على نفس شبكة الكاميرات. ثبّت Node.js ‏20 أو أحدث وFFmpeg مع FFprobe من مصادرهما الرسمية، ثم نزّل معالج INFRO وافحص الجهاز. لا تُدخل بيانات الكاميرا في الأوامر.</p>
    <a href="/connectors/infro-live-windows.mjs" download className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#087e78] px-5 text-sm font-bold text-white">تنزيل ملف الإعداد اليدوي Windows</a>
    <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-8">
      <li>افتح الطرفية في مجلد التنزيل وشغّل الفحص:<code dir="ltr" className="mt-2 block select-all overflow-x-auto rounded-lg bg-slate-50 p-3 text-left text-xs">node infro-live-windows.mjs --check</code></li>
      <li>بعد تفعيل الخدمة من إدارة INFRO، أضف الموقع وولّد رمز الاقتران هنا، ثم شغّل المعالج وأدخل الرمز عند الطلب:<code dir="ltr" className="mt-2 block select-all overflow-x-auto rounded-lg bg-slate-50 p-3 text-left text-xs">node infro-live-windows.mjs --install</code></li>
      <li>عد إلى حسابك لإضافة الكاميرات وفحصها. نجاح التسجيل في Windows لا يعني أن بث الكاميرا جاهز؛ تأكد من حالة الاتصال والبث في INFRO.</li>
    </ol>
    <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-7 text-amber-950">يضيف المعالج تشغيلًا تلقائيًا عند تسجيل دخول مستخدم Windows نفسه، دون حفظ كلمة مرور Windows. أبقِ الجهاز متصلًا بالكهرباء والشبكة ومستيقظًا والمستخدم مسجل الدخول. بعد إعادة التشغيل يلزم تسجيل الدخول مجددًا.</p>
    </details>
  </section>;
}
