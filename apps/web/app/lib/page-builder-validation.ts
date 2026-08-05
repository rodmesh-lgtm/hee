import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطة فقط")
  .min(2, "الرابط قصير جداً")
  .max(60, "الرابط طويل جداً");

export const identitySchema = z.object({
  name: z.string().trim().min(2, "اسم النشاط مطلوب"),
  nameEn: z.string().trim().optional(),
  businessType: z.string().trim().min(2, "نوع النشاط مطلوب"),
  shortDescription: z.string().trim().min(6, "الوصف المختصر مطلوب"),
  description: z.string().trim().min(10, "الوصف الكامل مطلوب"),
});

export const contactSchema = z.object({
  whatsapp: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  website: z.string().trim().optional(),
  instagramUrl: z.string().trim().optional(),
  tiktokUrl: z.string().trim().optional(),
  snapchatUrl: z.string().trim().optional(),
  xUrl: z.string().trim().optional(),
  facebookUrl: z.string().trim().optional(),
});

export const locationSchema = z.object({
  country: z.string().trim().min(2, "الدولة مطلوبة"),
  city: z.string().trim().min(2, "المدينة مطلوبة"),
  district: z.string().trim().min(2, "الحي مطلوب"),
  address: z.string().trim().min(5, "العنوان مطلوب"),
  googleMapsLink: z.string().trim().optional(),
});

export const workingHourItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  secondOpensAt: z.string().nullable(),
  secondClosesAt: z.string().nullable(),
});

export const workingHoursSchema = z.array(workingHourItemSchema).length(7, "يجب تحديد ساعات 7 أيام");

export const productSchema = z.object({
  name: z.string().trim().min(2, "اسم المنتج مطلوب"),
  description: z.string().trim().min(3, "وصف المنتج مطلوب"),
  categoryName: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  price: z.coerce.number().nonnegative("السعر غير صالح"),
  oldPrice: z.coerce.number().nonnegative("السعر القديم غير صالح").nullable(),
  isActive: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "اسم الخدمة مطلوب"),
  description: z.string().trim().min(3, "وصف الخدمة مطلوب"),
  price: z.coerce.number().nonnegative("السعر غير صالح"),
  durationMinutes: z.coerce.number().int().min(0).nullable(),
  bookingEnabled: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

export const offerSchema = z.object({
  title: z.string().trim().min(2, "عنوان العرض مطلوب"),
  description: z.string().trim().min(3, "وصف العرض مطلوب"),
  discountLabel: z.string().trim().min(1, "قيمة الخصم مطلوبة"),
  startsAt: z.string().trim().optional(),
  endsAt: z.string().trim().optional(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});
