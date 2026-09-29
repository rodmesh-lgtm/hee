import { BOOKING_CONFIRMATION_TEMPLATE_EXAMPLE } from "./booking-confirmation-domain";
import { SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE } from "./salla-order-confirmation-domain";
// Draft copy only. Selection never creates a template or enables an automation.
export const TEMPLATE_STARTERS = [
  { key: "order_confirmation", label: "تأكيد الطلب", category: "UTILITY", name: "infro_order_confirmation", body: SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE, examples: "أحمد | متجر المثال | 1024", hint: "متوافق مع متغيرات مسار تأكيد طلب سلة المدفوع." },
  { key: "order_shipped", label: "شحن الطلب", category: "UTILITY", name: "infro_order_shipped", body: "مرحبًا {{1}}، تم شحن طلبك رقم {{3}} من {{2}}.", examples: "أحمد | متجر المثال | 1024", hint: "متوافق مع متغيرات مسار شحن طلب سلة." },
  { key: "booking", label: "تأكيد الموعد", category: "UTILITY", name: "infro_booking_confirmation", body: BOOKING_CONFIRMATION_TEMPLATE_EXAMPLE, examples: "المنشأة التجريبية | صيانة | الفرع الرئيسي | الأحد 4 أكتوبر | 4 مساءً | 5 مساءً | ABC12345", hint: "متوافق مع متغيرات إشعار الحجز السبعة. اربطه من إعدادات الحجوزات بعد اعتماده." },
  { key: "cart", label: "تذكير بسلة متروكة", category: "MARKETING", name: "infro_cart_reminder", body: "مرحبًا، ما زالت مشترياتك بانتظارك في متجرنا. يسعدنا مساعدتك لإكمال طلبك. لإيقاف الرسائل أرسل إيقاف.", examples: "", hint: "نموذج بلا متغيرات متوافق مع مسار السلة الحالي، ويتطلب موافقة تسويقية." },
  { key: "review", label: "طلب تقييم الخدمة", category: "MARKETING", name: "infro_service_feedback", body: "مرحبًا {{1}}، يسعدنا معرفة رأيك في تجربتك مع {{2}}. شاركنا تقييمك لنقدم لك خدمة أفضل. لإيقاف الرسائل أرسل إيقاف.", examples: "أحمد | المنشأة التجريبية", hint: "أضف رابط التقييم في زر القالب. التصنيف النهائي تحدده Meta." },
  { key: "offer", label: "عرض لعملائك", category: "MARKETING", name: "infro_customer_offer", body: "مرحبًا {{1}}، اكتشف {{2}} لدى {{3}}. العرض متاح حتى {{4}}. لإيقاف الرسائل أرسل إيقاف.", examples: "أحمد | عرض الصيانة | المنشأة التجريبية | 15 أكتوبر", hint: "يمكن إضافة صورة أو فيديو أو PDF وعينة للمراجعة من حقول المحرر." },
] as const;
