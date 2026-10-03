type DeliveryState = {
  status: string;
  queued: number;
  processing: number;
  retrying: number;
  unknown: number;
  sent: number;
  delivered: number;
  snapshot: number;
  ready: boolean;
};

// Only describe durable state. Worker health and queued jobs are not delivery receipts.
export function campaignDeliverySummary(state: DeliveryState) {
  if (state.status === "cancelled") return { title: "الحملة ملغاة", detail: "توقفت الرسائل المتبقية. قد تصل إيصالات للرسائل التي أُرسلت قبل الإلغاء." };
  if (state.status === "paused") return { title: "الإرسال متوقف مؤقتًا", detail: "استأنف الحملة عند الاستعداد. الرسائل التي بدأت معالجتها قد تستكمل الإرسال." };
  if (state.status === "draft") return { title: "مسودة لم تجهز للإرسال", detail: "لم تكتمل قائمة المستلمين. راجع جهات الاتصال والقالب قبل إنشاء حملة جديدة." };
  if (state.status === "ready") return { title: "جاهزة للمراجعة والإطلاق", detail: "لم يبدأ الإرسال. راجع الجمهور ثم اختر بدء الإرسال أو الجدولة." };
  if (state.status === "scheduled") return { title: "بانتظار الموعد المحدد", detail: "تبدأ المعالجة بعد الموعد، وفق جاهزية الخدمة وحدود الرقم." };
  if (state.unknown > 0) return { title: "بعض النتائج تحتاج مراجعة", detail: "لم نتلقَّ تأكيدًا نهائيًا لبعض طلبات الإرسال. لا تعِد إرسالها لتجنب التكرار؛ نزّل التقرير لمراجعتها." };
  if (state.status === "failed") return { title: "تعذر إكمال الحملة", detail: "راجع تقرير المستلمين وحالة اتصال الرقم والقالب قبل أي محاولة جديدة." };
  if (state.status === "completed") return { title: "اكتملت معالجة الحملة", detail: "اكتمال المعالجة لا يعني وصول جميع الرسائل؛ أرقام التسليم والقراءة تعتمد على إيصالات Meta." };
  if (state.processing > 0) return { title: "تجري معالجة الرسائل", detail: "تتغير حالة الرسالة إلى تم الإرسال بعد قبول Meta لها، ثم إلى تم التسليم عند وصول الإيصال." };
  if (state.retrying > 0) return { title: "إعادة محاولة مجدولة", detail: "تنتظر بعض الرسائل مهلة إعادة المحاولة أو نافذة الإرسال. لا تُنشئ حملة مكررة لهذه الأرقام." };
  if (!state.ready) return { title: "بانتظار جاهزية خدمة الإرسال", detail: "الحملة محفوظة؛ راجع تفاصيل التشغيل أعلى الصفحة. لا حاجة لإنشاء نسخة أخرى منها." };
  if (state.queued > 0) return { title: "الرسائل في طابور الإرسال", detail: "تم إطلاق الحملة وتنتظر الرسائل دور المعالجة وفق أوقات الإرسال وحدود الرقم. لم تُحسب رسائل الطابور كرسائل مُرسلة." };
  if (state.sent > state.delivered) return { title: "بانتظار تأكيد التسليم", detail: "قبلت Meta رسائل للإرسال، وننتظر إيصالات الوصول. لا يُضمن وصول كل رسالة." };
  if (state.snapshot > 0) return { title: "بقية الجمهور لم تدخل الطابور", detail: "قد تكون الدفعة التجريبية أو مرحلة تجهيز الإرسال قيد المتابعة. أول إرسال يظل محدودًا بخمسة مستلمين حتى ثبوت التسليم." };
  return { title: "متابعة نتائج الحملة", detail: "تُحدّث الأرقام عند وصول إيصالات Meta. راجع التقرير لمعرفة حالة كل مستلم." };
}

export function formatCampaignTime(date: Date) {
  return `${date.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })} · توقيت الرياض`;
}
