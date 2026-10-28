import Link from "next/link";
import { ACCOUNTING_SECURITY_MESSAGE } from "../lib/accounting-security";
export function AccountingSecurityNotice() {
  return <main dir="rtl" className="mx-auto max-w-2xl space-y-5 p-8" role="status">
    <p className="text-sm font-bold">INFRO · حماية بيانات المنشأة</p>
    <h1 className="text-2xl font-bold">مراجعة أمان الحسابات</h1>
    <p>{ACCOUNTING_SECURITY_MESSAGE}</p>
    <p>لن تُعرض سجلات منشأة أخرى. تتولى إدارة INFRO التحقق قبل إعادة إتاحة الخدمة.</p>
    <Link className="inline-flex min-h-11 items-center underline" href="/dashboard">العودة إلى لوحة التحكم</Link>
  </main>;
}
