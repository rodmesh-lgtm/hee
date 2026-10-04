import { publicMediaUrl } from "./campaign-composition";

// Multipart form serialization expands LF to CRLF. Count and send the same
// line endings as textarea.value so transport encoding cannot inflate copy.
export function normalizeTemplateBody(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

const validationErrors: Record<string, { field: string; message: string }> = {
  TEMPLATE_NAME_INVALID: { field: "name", message: "اسم القالب: استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطة سفلية فقط، وابدأ بحرف. الحد الأقصى 100 حرف." },
  TEMPLATE_LANGUAGE_INVALID: { field: "language", message: "اختر إحدى اللغات المتاحة للقالب." },
  TEMPLATE_CATEGORY_INVALID: { field: "category", message: "اختر فئة تسويق أو خدمة مرتبطة بطلب أو حجز." },
  TEMPLATE_BODY_REQUIRED: { field: "body", message: "أدخل نص الرسالة قبل إرسال القالب للمراجعة." },
  TEMPLATE_BODY_TOO_LONG: { field: "body", message: "نص الرسالة يتجاوز 1024 حرفًا. اختصر النص ثم أعد المحاولة." },
  TEMPLATE_FOOTER_TOO_LONG: { field: "footer", message: "التذييل يتجاوز 60 حرفًا. اختصر التذييل ثم أعد المحاولة." },
  TEMPLATE_HEADER_INVALID: { field: "header", message: "اختر رأس رسالة نصيًا أو صورة أو فيديو أو PDF." },
  TEMPLATE_VARIABLES_INVALID: { field: "body", message: "متغيرات نص الرسالة غير صحيحة. استخدم {{1}} ثم {{2}} دون أرقام ناقصة، وبحد أقصى 20 متغيرًا." },
  TEMPLATE_EXAMPLES_REQUIRED: { field: "examples", message: "أدخل مثالًا لكل متغير في النص بالترتيب، وافصل الأمثلة بعلامة |. يجب ألا يتجاوز المثال 512 حرفًا." },
  TEMPLATE_BUTTON_TEXT_REQUIRED: { field: "buttonText", message: "أضفت رابطًا دون عنوان للزر. أدخل عنوان الزر أو احذف الرابط." },
  TEMPLATE_BUTTON_TEXT_TOO_LONG: { field: "buttonText", message: "عنوان زر الرابط يتجاوز 25 حرفًا. اختصر عنوان الزر." },
  TEMPLATE_BUTTON_URL_INVALID: { field: "buttonUrl", message: "رابط الزر غير صالح. أدخل رابط HTTPS عامًا وكاملًا لا يتجاوز 2048 حرفًا، دون بيانات دخول أو منفذ مخصص." },
  TEMPLATE_BUTTON_VARIABLE_INVALID: { field: "buttonUrl", message: "متغيرات رابط الزر غير مدعومة هنا. استخدم رابطًا ثابتًا أو رابط تتبع الحملة المعتمد في INFRO." },
  TEMPLATE_SAMPLE_REQUIRED: { field: "sample", message: "أعد اختيار عينة مطابقة لنوع القالب وحد الحجم الموضح بجانب الملف، ثم انتظر اكتمال رفعها." },
};

// Only known validation codes reach the UI; never display arbitrary provider errors.
export function templateValidationError(error: unknown) {
  const code = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return Object.hasOwn(validationErrors, code) ? { ...validationErrors[code], code } : undefined;
}
export function canEditSimpleTemplate(components: unknown) {
  if (!Array.isArray(components)) return false;
  return components.every((c) => {
    if (!c || typeof c !== "object") return false;
    if (c.type === "BODY" || c.type === "FOOTER") return true;
    if (c.type === "HEADER") return ["IMAGE", "VIDEO", "DOCUMENT"].includes(c.format);
    if (c.type === "BUTTONS") return Array.isArray(c.buttons) && c.buttons.length <= 1 && c.buttons.every((b: { type?: string; url?: string }) => b.type === "URL" && (!b.url?.includes("{{") || b.url === "https://ir.sa/api/whatsapp/campaign-link/{{1}}"));
    return false;
  });
}
export function buildTemplateSubmission(input: { name: string; language: string; category: string; body: string; footer: string; header: string; mediaHandle?: string; examples: string; buttonText: string; buttonUrl: string; codeExpirationMinutes?: number }) {
  if (input.category === "AUTHENTICATION") {
    if (!/^[a-z][a-z0-9_]{0,99}$/.test(input.name) || !["ar", "en", "en_US", "en_GB"].includes(input.language)
      || input.header !== "NONE" || input.body || input.footer || input.buttonUrl || input.buttonText || input.examples
      || !Number.isInteger(input.codeExpirationMinutes) || input.codeExpirationMinutes! < 1 || input.codeExpirationMinutes! > 90) throw new Error("TEMPLATE_AUTHENTICATION_INVALID");
    // Meta supplies the localized authentication copy. Never accept arbitrary OTP text/media.
    return { name: input.name, language: input.language, category: input.category, components: [
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: input.codeExpirationMinutes },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: input.language === "ar" ? "نسخ الرمز" : "Copy code" }] },
    ] as Array<Record<string, unknown>> };
  }
  input = { ...input, body: normalizeTemplateBody(input.body) };
  if (!/^[a-z][a-z0-9_]{0,99}$/.test(input.name)) throw new Error("TEMPLATE_NAME_INVALID");
  if (!["ar", "en", "en_US", "en_GB"].includes(input.language)) throw new Error("TEMPLATE_LANGUAGE_INVALID");
  if (!["MARKETING", "UTILITY"].includes(input.category)) throw new Error("TEMPLATE_CATEGORY_INVALID");
  if (!input.body.trim()) throw new Error("TEMPLATE_BODY_REQUIRED");
  if (input.body.length > 1024) throw new Error("TEMPLATE_BODY_TOO_LONG");
  if (input.footer.length > 60) throw new Error("TEMPLATE_FOOTER_TOO_LONG");
  if (!["NONE", "IMAGE", "VIDEO", "DOCUMENT"].includes(input.header)) throw new Error("TEMPLATE_HEADER_INVALID");
  const variables = [...new Set([...input.body.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]))].sort((a,b) => Number(a)-Number(b));
  if (/\{\{|\}\}/.test(input.body.replace(/\{\{\d+\}\}/g, "")) || variables.some((v, i) => v !== String(i + 1)) || variables.length > 20) throw new Error("TEMPLATE_VARIABLES_INVALID");
  const examples = input.examples.split("|").map((s) => s.trim());
  if (variables.length && (examples.length !== variables.length || examples.some((s) => !s || s.length > 512))) throw new Error("TEMPLATE_EXAMPLES_REQUIRED");
  const components: Array<Record<string, unknown>> = [];
  if (input.header !== "NONE") {
    if (!input.mediaHandle) throw new Error("TEMPLATE_SAMPLE_REQUIRED");
    components.push({ type: "HEADER", format: input.header, example: { header_handle: [input.mediaHandle] } });
  }
  components.push({ type: "BODY", text: input.body.trim(), ...(variables.length ? { example: { body_text: [examples] } } : {}) });
  if (input.footer.trim()) components.push({ type: "FOOTER", text: input.footer.trim() });
  if (input.buttonText || input.buttonUrl) {
    if (!input.buttonText.trim()) throw new Error("TEMPLATE_BUTTON_TEXT_REQUIRED");
    if (input.buttonText.length > 25) throw new Error("TEMPLATE_BUTTON_TEXT_TOO_LONG");
    if (!publicMediaUrl(input.buttonUrl)) throw new Error("TEMPLATE_BUTTON_URL_INVALID");
    if (/\{\{|\}\}/.test(input.buttonUrl) && input.buttonUrl !== "https://ir.sa/api/whatsapp/campaign-link/{{1}}") throw new Error("TEMPLATE_BUTTON_VARIABLE_INVALID");
    components.push({ type: "BUTTONS", buttons: [{ type: "URL", text: input.buttonText.trim(), url: input.buttonUrl, ...(input.buttonUrl === "https://ir.sa/api/whatsapp/campaign-link/{{1}}" ? { example: ["https://ir.sa/api/whatsapp/campaign-link/00000000-0000-4000-8000-000000000000"] } : {}) }] });
  }
  return { name: input.name, language: input.language, category: input.category, components };
}
