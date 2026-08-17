import { PublicBusinessPageV10Light } from "../../components/public-business-page-v10-light";

export const dynamic = "force-dynamic";

const demoBusiness = {
  id: "hee-demo",
  slug: "demo",
  name: "شركة الرواد للمقاولات",
  nameEn: "Al Rowad Contracting",
  description: "شركة سعودية متخصصة في المقاولات العامة والتشطيبات وإدارة المشاريع، نقدم حلولاً متكاملة بمعايير جودة عالية وفريق متخصص.",
  shortDescription: "شركة سعودية متخصصة في المقاولات العامة والتشطيبات وإدارة المشاريع بمعايير جودة عالية.",
  businessCategory: "مقاولات عامة",
  businessType: "شركة مقاولات",
  city: "الرياض",
  district: "حي العليا",
  address: "طريق الملك فهد، حي العليا",
  country: "SA",
  phone: "+966500000001",
  whatsapp: "+966500000001",
  email: "info@example.sa",
  website: "https://example.sa",
  logoUrl: null,
  coverUrl: null,
  googleMapsLink: "https://maps.google.com/?q=Riyadh",
  workingHours: "السبت - الخميس، 8:00 ص - 6:00 م",
  isVerified: true,
  isPublished: true,
  metaTitle: null,
  metaDescription: null,
  instagramUrl: null,
  tiktokUrl: null,
  snapchatUrl: null,
  xUrl: null,
  facebookUrl: null,
  products: [],
  offers: [],
  services: [
    { id: "s1", name: "المقاولات العامة", description: "تنفيذ مشاريع البناء والإنشاء من البداية حتى التسليم.", isActive: true },
    { id: "s2", name: "التشطيبات الداخلية", description: "تشطيبات متكاملة للمشاريع السكنية والتجارية.", isActive: true },
    { id: "s3", name: "إدارة المشاريع", description: "إدارة ومتابعة المشروع وفق الجداول الزمنية ومعايير الجودة.", isActive: true },
    { id: "s4", name: "الترميم والصيانة", description: "أعمال ترميم وصيانة ورفع كفاءة المباني.", isActive: true },
  ],
  openingHours: [{ id: "h1", opensAt: "08:00", closesAt: "18:00", isClosed: false }],
  galleryItems: [
    { id: "g1", imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80" },
    { id: "g2", imageUrl: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=80" },
    { id: "g3", imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80" },
  ],
  socialLinks: [],
  branches: [
    { id: "b1", name: "الفرع الرئيسي", city: "الرياض", district: "العليا", address: "طريق الملك فهد", googleMapsLink: "https://maps.google.com/?q=Riyadh", isActive: true },
    { id: "b2", name: "فرع شمال الرياض", city: "الرياض", district: "الياسمين", address: "طريق أنس بن مالك", googleMapsLink: "https://maps.google.com/?q=Riyadh", isActive: true },
    { id: "b3", name: "فرع جدة", city: "جدة", district: "الروضة", address: "شارع الأمير سلطان", googleMapsLink: "https://maps.google.com/?q=Jeddah", isActive: true },
  ],
  contactPersons: [],
  departments: [
    { id: "d1", name: "المبيعات", isActive: true, contacts: [
      { id: "c1", name: "محمد العتيبي", jobTitle: "ممثل مبيعات", imageUrl: null, phone: "+966500000001", whatsapp: "+966500000001", isActive: true, branch: null },
      { id: "c2", name: "سارة القحطاني", jobTitle: "علاقات العملاء", imageUrl: null, phone: "+966500000001", whatsapp: "+966500000001", isActive: true, branch: null },
    ]},
    { id: "d2", name: "العمليات", isActive: true, contacts: [
      { id: "c3", name: "خالد الحربي", jobTitle: "مدير العمليات", imageUrl: null, phone: "+966500000001", whatsapp: "+966500000001", isActive: true, branch: null },
      { id: "c4", name: "نورة الشهري", jobTitle: "خدمة العملاء", imageUrl: null, phone: "+966500000001", whatsapp: "+966500000001", isActive: true, branch: null },
    ]},
  ],
} as any;

export default function DemoPage() {
  return <PublicBusinessPageV10Light business={demoBusiness} qrDataUrl="" publicUrl="https://hee.sa/demo" demoMode />;
}
