"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function ContactImportInput() {
  const [source, setSource] = useState("file");
  const { pending } = useFormStatus();
  return <fieldset disabled={pending} className="mt-4 space-y-3">
    <legend className="text-sm font-bold">طريقة الاستيراد</legend>
    <div className="flex flex-wrap gap-2">{[["file", "ملف CSV أو Excel"], ["paste", "نسخ ولصق الأرقام"]].map(([value, label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-bold ${source === value ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100" : "border-slate-300 text-slate-700 dark:text-slate-200"}`}><input type="radio" name="importSource" value={value} checked={source === value} onChange={() => setSource(value)} className="accent-teal-600"/>{label}</label>)}</div>
    {source === "file" ? <label className="block rounded-xl border border-dashed border-teal-300 p-4 text-sm">اختر ملف CSV أو Excel<ImportFileInput /></label> : <label className="block text-sm font-bold">الأرقام المراد استيرادها
      <textarea name="pastedPhones" required rows={7} dir="ltr" spellCheck={false} aria-describedby="paste-import-help" placeholder={"966501234567\n966551234567"} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-base leading-7 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30" onChange={event => {
        const input = event.currentTarget;
        input.setCustomValidity(new TextEncoder().encode(input.value).length > 4 * 1024 * 1024 ? "حجم النص يتجاوز 4 MB؛ قسّمه إلى دفعات أصغر." : "");
      }}/>
      <span id="paste-import-help" className="mt-2 block text-xs font-normal leading-6 text-slate-600 dark:text-slate-300">الصق الأرقام بصيغة 9665xxxxxxxx دون + أو 00. ضع كل رقم في سطر، أو افصل بفاصلة. يمكنك لصق عمود من Excel دون عنوان. سنفحص الأرقام ونتجاهل التكرارات، وتظهر النتائج في سجل الاستيراد.</span>
    </label>}
  </fieldset>;
}

export function ContactImportSubmit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="mt-3 min-h-11 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">{pending ? "جارٍ فحص الأرقام…" : "فحص الأرقام واستيرادها"}</button>;
}

export function ImportFileInput() {
  return <input name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-3 block max-w-full text-[10px] text-slate-500" onChange={(event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.setCustomValidity(file && file.size > 4 * 1024 * 1024 ? "حجم الملف يتجاوز 4 MB. قسّمه إلى ملفات أصغر؛ لا يوجد حد عددي لإجمالي جهات الاتصال المستوردة." : "");
    input.reportValidity();
  }} />;
}
