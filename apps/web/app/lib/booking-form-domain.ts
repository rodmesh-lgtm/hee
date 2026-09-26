export type BookingField = { id: string; label: string; type: "text" | "textarea" | "select"; required: boolean; options: string[] };
export type BookingForm = { id: string; title: string; description: string; notesEnabled: boolean; notesLabel: string; fields: BookingField[] };
export type BookingFormCatalog = { version: 1; activeId: string; forms: BookingForm[] };
export const BOOKING_FORM_KEY = "infro.booking-forms.v1";
export const DEFAULT_BOOKING_FORM: BookingForm = {
  id: "default", title: "حجز موعد", description: "رقم جوالك وموعد يناسبك؛ يسعدنا خدمتك.",
  notesEnabled: true, notesLabel: "ملاحظة اختيارية لخدمتك بشكل أفضل", fields: [],
};
export const DEFAULT_BOOKING_CATALOG: BookingFormCatalog = { version: 1, activeId: "default", forms: [DEFAULT_BOOKING_FORM] };
const idPattern = /^[a-zA-Z0-9_-]{1,60}$/;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("بيانات النموذج غير صالحة");
  return value as Record<string, unknown>;
}
function label(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`أدخل نصًا من 1 إلى ${max} حرفًا`);
  return value.trim();
}
export function parseBookingCatalog(value: unknown): BookingFormCatalog {
  const raw = record(value);
  if (raw.version !== 1 || !Array.isArray(raw.forms) || raw.forms.length < 1 || raw.forms.length > 8) throw new Error("احتفظ بنموذج واحد إلى ثمانية نماذج");
  const ids = new Set<string>();
  const forms = raw.forms.map((entry): BookingForm => {
    const form = record(entry); const id = label(form.id, 60);
    if (!idPattern.test(id) || ids.has(id)) throw new Error("معرف النموذج مكرر أو غير صالح");
    ids.add(id);
    if (typeof form.notesEnabled !== "boolean" || !Array.isArray(form.fields) || form.fields.length > 8) throw new Error("إعدادات حقول النموذج غير صالحة");
    const fieldIds = new Set<string>();
    const fields = form.fields.map((entry): BookingField => {
      const field = record(entry); const fieldId = label(field.id, 60);
      if (!idPattern.test(fieldId) || fieldIds.has(fieldId)) throw new Error("معرف الحقل مكرر أو غير صالح");
      fieldIds.add(fieldId);
      if (!["text", "textarea", "select"].includes(String(field.type)) || typeof field.required !== "boolean") throw new Error("نوع الحقل غير صالح");
      const options = field.type === "select" && Array.isArray(field.options) ? field.options.map(option => label(option, 80)) : [];
      if (field.type === "select" && (options.length < 1 || options.length > 12 || new Set(options).size !== options.length)) throw new Error("أدخل من خيار واحد إلى 12 خيارًا مختلفًا");
      return { id: fieldId, label: label(field.label, 100), type: field.type as BookingField["type"], required: field.required, options };
    });
    return { id, title: label(form.title, 80), description: label(form.description, 240), notesEnabled: form.notesEnabled, notesLabel: label(form.notesLabel, 120), fields };
  });
  if (typeof raw.activeId !== "string" || !ids.has(raw.activeId)) throw new Error("اختر نموذجًا منشورًا موجودًا");
  return { version: 1, activeId: raw.activeId, forms };
}
export function bookingFormNotes(form: BookingForm, notes: string, answers: unknown): string {
  if (notes.length > 1000) throw new Error("الملاحظة أطول من المسموح");
  const input = answers === undefined ? {} : record(answers);
  if (Object.keys(input).some(key => !form.fields.some(field => field.id === key))) throw new Error("تغير النموذج؛ حدّث الصفحة ثم أعد المحاولة");
  const result = form.notesEnabled && notes.trim() ? [notes.trim()] : [];
  for (const field of form.fields) {
    const raw = input[field.id];
    if (raw !== undefined && typeof raw !== "string") throw new Error("إجابة غير صالحة");
    const answer = typeof raw === "string" ? raw.trim() : "";
    if (field.required && !answer) throw new Error(`أكمل حقل ${field.label}`);
    if (answer.length > 300 || (answer && field.type === "select" && !field.options.includes(answer))) throw new Error(`تحقق من حقل ${field.label}`);
    if (answer) result.push(`${field.label}: ${answer}`);
  }
  const output = result.join("\n");
  if (output.length > 4000) throw new Error("إجابات النموذج أطول من المسموح");
  return output;
}
