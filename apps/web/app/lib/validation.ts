import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "الاسم مطلوب"),
    email: z.string().email("البريد الإلكتروني غير صالح"),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: z.string().min(8, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export const businessSchema = z.object({
  name: z.string().min(2, "اسم النشاط مطلوب"),
  slug: z.string().min(2, "الاسم المستعار مطلوب").regex(/^[a-z0-9-]+$/, "يجب أن يحتوي الاسم المستعار على أحرف صغيرة أو أرقام أو شرطة فقط"),
  businessType: z.string().min(1, "اختر نوع النشاط"),
  description: z.string().min(5, "الوصف مطلوب"),
  city: z.string().min(2, "المدينة مطلوبة"),
  whatsapp: z.string().min(6, "واتساب مطلوب"),
  phone: z.string().min(6, "الهاتف مطلوب"),
  address: z.string().min(5, "العنوان مطلوب"),
  logoUrl: z.string().url("رابط الشعار غير صالح").optional().or(z.literal("")),
  primaryColor: z.string().min(1, "اختر اللون الأساسي"),
});

export const productSchema = z.object({
  name: z.string().min(2, "اسم المنتج مطلوب"),
  description: z.string().min(3, "الوصف مطلوب"),
  price: z.string().min(1, "السعر مطلوب"),
  imageUrl: z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
