import { z } from "zod";
import { isValidPublicSlug, normalizePublicSlug } from "./public-url";

const publicSlugSchema = z.string().trim().transform(normalizePublicSlug).refine((value) => value.length <= 60 && isValidPublicSlug(value), "الرابط العام غير صالح");
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(120, "الاسم طويل جدًا"),
  email: z.string().trim().email("البريد الإلكتروني غير صالح").max(254, "البريد الإلكتروني طويل جدًا"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(200, "كلمة المرور طويلة جدًا").refine((value) => passwordComplexityRegex.test(value), "يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم ورمز"),
  confirmPassword: z.string().min(8, "تأكيد كلمة المرور مطلوب").max(200, "كلمة المرور طويلة جدًا"),
}).refine((data) => data.password === data.confirmPassword, { message: "كلمتا المرور غير متطابقتين", path: ["confirmPassword"] });

export const loginSchema = z.object({
  email: z.string().trim().email("البريد الإلكتروني غير صالح").max(254, "البريد الإلكتروني طويل جدًا"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(200, "كلمة المرور طويلة جدًا"),
});

export const businessSchema = z.object({
  name: z.string().trim().min(2, "اسم النشاط مطلوب").max(120, "اسم النشاط طويل جدًا"),
  slug: publicSlugSchema,
  businessType: z.string().trim().min(1, "اختر نوع النشاط").max(120, "نوع النشاط طويل جدًا"),
  shortDescription: z.string().trim().max(160, "الوصف المختصر طويل جدًا").optional().default(""),
  description: z.string().trim().max(4000, "وصف النشاط طويل جدًا").optional().default(""),
  city: z.string().trim().max(80, "اسم المدينة طويل جدًا").optional().default(""),
  whatsapp: z.string().trim().max(40, "رقم واتساب طويل جدًا").optional().default(""),
  phone: z.string().trim().max(40, "رقم الهاتف طويل جدًا").optional().default(""),
  address: z.string().trim().max(500, "العنوان طويل جدًا").optional().default(""),
  logoUrl: z.string().trim().max(1000, "رابط الشعار طويل جدًا").optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "اللون الأساسي غير صالح"),
  entityType: z.string().trim().max(120, "نوع الكيان طويل جدًا").optional().default(""),
  businessCategory: z.string().trim().max(120, "تصنيف النشاط طويل جدًا").optional().default(""),
  onboardingCompleted: z.boolean().optional().default(false),
  onboardingStep: z.string().trim().max(80).optional().default("account_created"),
});
