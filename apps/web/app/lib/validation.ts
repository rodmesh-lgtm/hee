import { z } from "zod";
import { isValidPublicSlug, normalizePublicSlug } from "./public-url";

const colorHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "اللون يجب أن يكون بصيغة HEX");
const publicSlugSchema = z.string().trim().transform(normalizePublicSlug).refine((value) => value.length <= 60 && isValidPublicSlug(value), "الرابط العام غير صالح");
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const optionalUrlSchema = z.string().trim().optional().transform((value) => (value && value.length > 0 ? value : null)).refine((value) => !value || /^https?:\/\//i.test(value), "الرابط يجب أن يبدأ بـ http:// أو https://");

export const registerSchema = z.object({ name: z.string().min(2, "الاسم مطلوب"), email: z.string().email("البريد الإلكتروني غير صالح"), password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").refine((value) => passwordComplexityRegex.test(value), "يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم ورمز"), confirmPassword: z.string().min(8, "تأكيد كلمة المرور مطلوب") }).refine((data) => data.password === data.confirmPassword, { message: "كلمتا المرور غير متطابقتين", path: ["confirmPassword"] });
export const loginSchema = z.object({ email: z.string().email("البريد الإلكتروني غير صالح"), password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل") });

export const businessSchema = z.object({
  name: z.string().min(2, "اسم النشاط مطلوب"),
  slug: publicSlugSchema,
  businessType: z.string().min(1, "اختر نوع النشاط"),
  shortDescription: z.string().trim().optional().default(""),
  description: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  whatsapp: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  logoUrl: z.string().trim().optional().or(z.literal("")),
  primaryColor: z.string().min(1, "اختر اللون الأساسي"),
  entityType: z.string().trim().optional().default(""),
  businessCategory: z.string().trim().optional().default(""),
  onboardingCompleted: z.boolean().optional().default(false),
  onboardingStep: z.string().trim().optional().default("account_created"),
});

export const productSchema = z.object({
  name: z.string().min(2, "اسم المنتج مطلوب"), description: z.string().min(3, "الوصف مطلوب"), unit: z.string().trim().optional(),
  price: z.string().min(1, "السعر مطلوب").transform((value) => Number(value.trim())).refine((value) => Number.isFinite(value) && value >= 0, "السعر يجب أن يكون رقمًا صالحًا"),
  oldPrice: z.string().optional().transform((value) => (value?.trim() ? Number(value.trim()) : null)).refine((value) => value === null || (Number.isFinite(value) && value >= 0), "السعر قبل الخصم يجب أن يكون رقمًا صالحًا"),
  imageUrl: z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")), isActive: z.boolean().optional(),
});

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "اسم النشاط بالعربية مطلوب"), nameEn: z.string().trim().min(2, "اسم النشاط بالإنجليزية مطلوب").regex(/^[a-zA-Z0-9\s&'().,-]+$/, "اسم النشاط بالإنجليزية يجب أن يحتوي على أحرف إنجليزية صحيحة"), businessType: z.string().trim().min(2, "تصنيف النشاط مطلوب"), shortDescription: z.string().trim().min(6, "الوصف المختصر مطلوب").or(z.literal("")), description: z.string().trim().min(10, "وصف النشاط مطلوب"), logoUrl: z.string().trim().min(1, "يرجى رفع شعار النشاط"), coverUrl: z.string().trim().min(1, "يرجى رفع صورة الغلاف"), phone: z.string().trim().min(6, "رقم الهاتف مطلوب"), whatsapp: z.string().trim().min(6, "رقم واتساب مطلوب"), email: z.string().trim().email("البريد الإلكتروني غير صالح"), website: optionalUrlSchema, country: z.string().trim().min(2, "الدولة مطلوبة"), city: z.string().trim().min(2, "المدينة مطلوبة"), district: z.string().trim().min(2, "الحي مطلوب"), googleMapsLink: optionalUrlSchema, xUrl: optionalUrlSchema, instagramUrl: optionalUrlSchema, snapchatUrl: optionalUrlSchema, tiktokUrl: optionalUrlSchema, facebookUrl: optionalUrlSchema, workingHours: z.string().trim().min(3, "ساعات العمل مطلوبة"), deliveryAvailable: z.boolean(), bookingAvailable: z.boolean(), acceptOnlineOrders: z.boolean(), primaryColor: colorHexSchema, secondaryColor: colorHexSchema, buttonColor: colorHexSchema, buttonStyle: z.enum(["rounded", "pill", "square"]), cardStyle: z.enum(["glass", "flat", "elevated"]), slug: publicSlugSchema, metaTitle: z.string().trim().min(10, "عنوان SEO مطلوب"), metaDescription: z.string().trim().min(30, "وصف SEO مطلوب"), isPublished: z.boolean(),
});
