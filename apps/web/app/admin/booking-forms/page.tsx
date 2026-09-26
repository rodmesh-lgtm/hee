import { requireAdmin } from "../../lib/admin";
import { readBookingForms } from "../../lib/booking-form-settings";
import { BookingFormsEditor } from "./editor";
export default async function BookingFormsPage() {
  await requireAdmin();
  const settings = await readBookingForms();
  return <main dir="rtl" className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6"><header><p className="text-xs font-bold text-teal-600">INFRO · نماذج المواعيد</p><h1 className="mt-2 text-2xl font-black">حجز بسيط، بطابع يناسب عملاءك</h1><p className="mt-2 text-sm leading-7 text-slate-500">أنشئ نماذج وأضف الحقول أو احذفها. النموذج المختار للنشر يطبق على صفحات الحجز في المنصة؛ المسودات لا تغير ما يراه الزائر.</p></header><BookingFormsEditor initial={settings.draft}/></main>;
}
