export type BusinessStoreCatalogItem = {
  sku: string;
  title: string;
  description: string;
  unitPrice: number;
  badge: string;
  maxQuantity: number;
};

// Prices are stored in halalas and are authoritative on the server. The store remains
// draft-only in this round; no checkout or payment flow is opened by this catalog.
export const BUSINESS_STORE_CATALOG: readonly BusinessStoreCatalogItem[] = [
  {
    sku: "desk-nameplate",
    title: "لوحة اسم مكتبية للمدير",
    description: "لوحة مكتبية باسم المدير والمسمى الوظيفي وشعار المنشأة، مع QR اختياري لصفحة HEE.",
    unitPrice: 12900,
    badge: "مقترح الإطلاق الأول",
    maxQuantity: 20,
  },
  {
    sku: "branded-mug-qr",
    title: "كوب بهوية المنشأة + QR",
    description: "كوب مخصص يحمل شعار المنشأة وألوانها ورمز QR الذي يقود مباشرة إلى صفحة الأعمال.",
    unitPrice: 7900,
    badge: "قابل للتخصيص",
    maxQuantity: 50,
  },
  {
    sku: "desk-qr-stand",
    title: "حامل QR للاستقبال والطاولات",
    description: "ستاند مكتبي يفتح صفحة المنشأة أو وسائل التواصل عبر QR واضح وسهل المسح.",
    unitPrice: 9900,
    badge: "للعملاء والزوار",
    maxQuantity: 30,
  },
  {
    sku: "nfc-business-card",
    title: "بطاقة أعمال NFC + QR",
    description: "بطاقة أعمال ذكية للمدير أو الموظف تجمع NFC وQR للوصول إلى صفحة HEE ومعلومات التواصل.",
    unitPrice: 14900,
    badge: "هوية رقمية + مادية",
    maxQuantity: 50,
  },
  {
    sku: "qr-stickers",
    title: "ملصقات QR للواجهة",
    description: "ملصقات للأبواب والكاشير والمركبات تربط الزائر مباشرة بصفحة الأعمال أو واتساب.",
    unitPrice: 4900,
    badge: "استخدام مرن",
    maxQuantity: 100,
  },
  {
    sku: "office-identity-bundle",
    title: "باقة هوية مكتبية",
    description: "حزمة تجمع لوحة الاسم والكوب وبطاقة NFC وحامل QR بتصميم موحد لهوية المنشأة.",
    unitPrice: 39900,
    badge: "باقة متكاملة",
    maxQuantity: 10,
  },
] as const;

export function getBusinessStoreCatalogItem(sku: unknown) {
  if (typeof sku !== "string") return null;
  return BUSINESS_STORE_CATALOG.find((item) => item.sku === sku) ?? null;
}
