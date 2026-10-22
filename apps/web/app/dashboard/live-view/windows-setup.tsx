export function WindowsConnectorSetup(){
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900" dir="rtl">
    <h2 className="font-black">تجهيز جهاز Windows في موقعك</h2>
    <p className="mt-3 text-sm leading-8 text-slate-600">استخدم جهازًا على نفس شبكة الكاميرات. ثبّت Node.js ‏20 أو أحدث وFFmpeg مع FFprobe من مصادرهما الرسمية، ثم نزّل معالج INFRO وافحص الجهاز. لا تُدخل بيانات الكاميرا في الأوامر.</p>
    <a href="/connectors/infro-live-windows.mjs" download className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#087e78] px-5 text-sm font-bold text-white">تنزيل معالج ربط Windows</a>
    <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-8">
      <li>افتح الطرفية في مجلد التنزيل وشغّل الفحص:<code dir="ltr" className="mt-2 block select-all overflow-x-auto rounded-lg bg-slate-50 p-3 text-left text-xs">node infro-live-windows.mjs --check</code></li>
      <li>بعد تفعيل الخدمة من إدارة INFRO، أضف الموقع وولّد رمز الاقتران هنا، ثم شغّل المعالج وأدخل الرمز عند الطلب:<code dir="ltr" className="mt-2 block select-all overflow-x-auto rounded-lg bg-slate-50 p-3 text-left text-xs">node infro-live-windows.mjs --install</code></li>
      <li>عد إلى حسابك لإضافة الكاميرات وفحصها. نجاح التسجيل في Windows لا يعني أن بث الكاميرا جاهز؛ تأكد من حالة الاتصال والبث في INFRO.</li>
    </ol>
    <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-7 text-amber-950">يضيف المعالج تشغيلًا تلقائيًا عند تسجيل دخول مستخدم Windows نفسه، دون حفظ كلمة مرور Windows. أبقِ الجهاز متصلًا بالكهرباء والشبكة ومستيقظًا والمستخدم مسجل الدخول. بعد إعادة التشغيل يلزم تسجيل الدخول مجددًا.</p>
  </section>;
}
