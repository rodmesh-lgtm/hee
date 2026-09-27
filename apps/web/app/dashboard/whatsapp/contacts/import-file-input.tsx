"use client";

export function ImportFileInput() {
  return <input name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-3 block max-w-full text-[10px] text-slate-500" onChange={(event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.setCustomValidity(file && file.size > 4 * 1024 * 1024 ? "حجم الملف يتجاوز 4 MB. قسّمه إلى ملفات أصغر؛ لا يوجد حد عددي لإجمالي جهات الاتصال المستوردة." : "");
    input.reportValidity();
  }} />;
}
