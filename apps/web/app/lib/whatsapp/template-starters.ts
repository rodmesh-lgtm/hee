import { BOOKING_CONFIRMATION_TEMPLATE_EXAMPLE } from "./booking-confirmation-domain";
import { SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE } from "./salla-order-confirmation-domain";
// Draft copy only. Selection never creates a template or enables an automation.
export const TEMPLATE_STARTERS = [
  { key: "otp", label: "رمز التحقق OTP", category: "AUTHENTICATION", name: "infro_verification_code", body: "", examples: "", hint: "نص مصادقة ثابت من Meta مع زر نسخ الرمز. يحتاج مسار تحقق يولّد الرمز ويتحقق منه؛ ليس رسالة حملة جماعية." },
  { key: "welcome", label: "ترحيب بالعميل", category: "MARKETING", name: "infro_welcome", body: "أهلًا بك، يسعدنا انضمامك إلى عملائنا. فريقنا جاهز لمساعدتك والإجابة عن استفساراتك. لإيقاف الرسائل أرسل إيقاف.", examples: "", hint: "متوافق مع الأتمتة العامة بلا متغيرات، ويتطلب موافقة العميل التسويقية." },
  { key: "follow_up", label: "متابعة بعد الخدمة", category: "MARKETING", name: "infro_follow_up", body: "شكرًا لاختيارك خدماتنا. نتمنى أن تكون تجربتك مميزة، ويسعدنا استقبال ملاحظاتك والرد على استفساراتك. لإيقاف الرسائل أرسل إيقاف.", examples: "", hint: "متوافق مع أتمتة المتابعة بعد إتمام طلب أو حجز، بعد اعتماد القالب وموافقة العميل." },
  { key: "reactivation", label: "إعادة تواصل مع العملاء", category: "MARKETING", name: "infro_customer_return", body: "يسعدنا التواصل معك مجددًا. نحن هنا لمساعدتك عند حاجتك إلى خدماتنا. تواصل معنا لمعرفة المزيد. لإيقاف الرسائل أرسل إيقاف.", examples: "", hint: "متوافق مع مسار العملاء غير النشطين. يتطلب موافقة تسويقية سارية." },
  { key: "order_confirmation", label: "تأكيد الطلب", category: "UTILITY", name: "infro_order_confirmation", body: SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE, examples: "أحمد | متجر المثال | 1024", hint: "متوافق مع متغيرات مسار تأكيد طلب سلة المدفوع." },
  { key: "order_shipped", label: "شحن الطلب", category: "UTILITY", name: "infro_order_shipped", body: "مرحبًا {{1}}، تم شحن طلبك رقم {{3}} من {{2}}.", examples: "أحمد | متجر المثال | 1024", hint: "متوافق مع متغيرات مسار شحن طلب سلة." },
  { key: "booking", label: "تأكيد الموعد", category: "UTILITY", name: "infro_booking_confirmation", body: BOOKING_CONFIRMATION_TEMPLATE_EXAMPLE, examples: "المنشأة التجريبية | صيانة | الفرع الرئيسي | الأحد 4 أكتوبر | 4 مساءً | 5 مساءً | ABC12345", hint: "متوافق مع متغيرات إشعار الحجز السبعة. اربطه من إعدادات الحجوزات بعد اعتماده." },
  { key: "cart", label: "تذكير بسلة متروكة", category: "MARKETING", name: "infro_cart_reminder", body: "مرحبًا، ما زالت مشترياتك بانتظارك في متجرنا. يسعدنا مساعدتك لإكمال طلبك. لإيقاف الرسائل أرسل إيقاف.", examples: "", hint: "نموذج بلا متغيرات متوافق مع مسار السلة الحالي، ويتطلب موافقة تسويقية." },
  { key: "review", label: "طلب تقييم الخدمة", category: "MARKETING", name: "infro_service_feedback", body: "مرحبًا {{1}}، يسعدنا معرفة رأيك في تجربتك مع {{2}}. شاركنا تقييمك لنقدم لك خدمة أفضل. لإيقاف الرسائل أرسل إيقاف.", examples: "أحمد | المنشأة التجريبية", hint: "أضف رابط التقييم في زر القالب. التصنيف النهائي تحدده Meta." },
  { key: "offer", label: "عرض لعملائك", category: "MARKETING", name: "infro_customer_offer", body: "مرحبًا {{1}}، اكتشف {{2}} لدى {{3}}. العرض متاح حتى {{4}}. لإيقاف الرسائل أرسل إيقاف.", examples: "أحمد | عرض الصيانة | المنشأة التجريبية | 15 أكتوبر", hint: "يمكن إضافة صورة أو فيديو أو PDF وعينة للمراجعة من حقول المحرر." },
  ...[
    ["order_delivered", "تسليم الطلب", "تم تسليم طلبك"],
    ["order_cancelled", "إلغاء الطلب", "تم إلغاء طلبك"],
    ["order_returned", "استرجاع الطلب", "تم تحديث حالة استرجاع طلبك"],
    ["order_processing", "تجهيز الطلب", "بدأ تجهيز طلبك"],
  ].map(([key, label, text]) => ({ key, label, category: "UTILITY", name: `infro_${key}`, body: `مرحبًا {{1}}، ${text} رقم {{3}} من {{2}}. تواصل معنا إذا احتجت إلى مساعدة.`, examples: "أحمد | متجر المثال | 1024", hint: "بعد الاعتماد، اختر هذا القالب للحالة المطابقة في إعدادات إشعارات طلبات سلة. لا تُفعّل الأحداث تلقائيًا بمجرد إنشاء القالب." })),
  { key: "review_thanks", label: "شكر على التقييم", category: "MARKETING", name: "infro_review_thanks", body: "مرحبًا {{1}}، شكرًا لمشاركتنا رأيك في {{2}}. يسعدنا أن نكون جزءًا من تجربتك. لإيقاف الرسائل أرسل إيقاف.", examples: "أحمد | متجر المثال", hint: "نموذج للتخصيص والإرسال من حملة بعد الاعتماد والموافقة التسويقية؛ ليس مرتبطًا تلقائيًا بحدث تقييم." },
  { key: "review_support", label: "متابعة ملاحظة العميل", category: "MARKETING", name: "infro_review_support", body: "مرحبًا {{1}}، يهمنا رأيك في {{2}}. يسعد فريقنا بالتواصل معك والاستماع إلى ملاحظاتك لتحسين تجربتك. لإيقاف الرسائل أرسل إيقاف.", examples: "أحمد | متجر المثال", hint: "أضف زر تواصل مناسبًا. إرسال المتابعة يخضع لاعتماد القالب وموافقة العميل؛ لا يوجد مشغّل تقييم تلقائي لهذا النموذج." },
  { key: "new_collection", label: "إطلاق منتجات جديدة", category: "MARKETING", name: "infro_new_collection", body: "مرحبًا {{1}}، وصلت مجموعتنا الجديدة إلى {{2}}. اكتشف التفاصيل واختر ما يناسبك. لإيقاف الرسائل أرسل إيقاف.", examples: "أحمد | متجر المثال", hint: "أضف صورة أو فيديو يعرض المنتجات، وزرًا إلى صفحة المجموعة." },
  { key: "catalog", label: "كتالوج PDF", category: "MARKETING", name: "infro_catalog_pdf", body: "مرحبًا {{1}}، يسعدنا مشاركتك دليل منتجات وخدمات {{2}}. تصفح الملف المرفق وتواصل معنا لمساعدتك. لإيقاف الرسائل أرسل إيقاف.", examples: "أحمد | متجر المثال", hint: "اختر رأس PDF وأرفق ملفًا للمراجعة. حدد ملف الإرسال الفعلي عند إعداد الحملة." },
] as const;

export const TEMPLATE_GROUPS = [{ key: "all", label: "كل النماذج" }, { key: "operations", label: "الطلبات والمواعيد" }, { key: "marketing", label: "التسويق" }, { key: "reviews", label: "التقييم والمتابعة" }, { key: "authentication", label: "رموز التحقق" }] as const;
export function starterGroup(key: string) {
  if (key === "otp") return "authentication";
  if (key.startsWith("review") || key === "follow_up") return "reviews";
  if (key.startsWith("order_") || key === "booking") return "operations";
  return "marketing";
}
