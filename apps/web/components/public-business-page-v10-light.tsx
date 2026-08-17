"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, BriefcaseBusiness, ChevronDown, Clock3, Globe2, Headphones, Images, Info, Mail, MapPin, MessageCircle, Phone, Share2, Sparkles, Star, UserRound, UsersRound } from "lucide-react";

type Business = Prisma.BusinessGetPayload<{ include: { products: { include: { category: true } }; offers: true; services: true; openingHours: true; galleryItems: true; socialLinks: true; branches: true; contactPersons: { include: { branch: true; department: true } }; departments: { include: { contacts: { include: { branch: true } } } }; } }>;
type Props = { business: Business; qrDataUrl: string; publicUrl: string; demoMode?: boolean };
type PanelKey = "about" | "services" | "branches" | "team" | "work" | "contact";

const clean = (value?: string | null) => String(value ?? "").trim();
const digits = (value?: string | null) => clean(value).replace(/\D/g, "");
const normalizedUrl = (value?: string | null) => { const raw = clean(value); if (!raw) return null; try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString(); } catch { return null; } };

export function PublicBusinessPageV10Light({ business, publicUrl, demoMode = false }: Props) {
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const fallbackPhone = demoMode ? "966500000001" : "";
  const fallbackWhatsapp = demoMode ? "966500000001" : "";
  const phone = digits(business.phone) || fallbackPhone;
  const whatsapp = digits(business.whatsapp) || fallbackWhatsapp;
  const location = [clean(business.city), clean(business.district)].filter(Boolean).join("، ") || (demoMode ? "الرياض" : "");
  const category = clean(business.businessCategory) || clean(business.businessType) || (demoMode ? "خدمات أعمال احترافية" : "");
  const about = clean(business.shortDescription) || clean(business.description) || (demoMode ? "منشأة سعودية تقدم خدمات احترافية بجودة عالية، وتركز على بناء علاقات موثوقة وتجربة سهلة لعملائها." : "");
  const logo = normalizedUrl(business.logoUrl);
  const website = normalizedUrl(business.website);
  const businessMap = normalizedUrl(business.googleMapsLink) || (location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : null);

  const realServices = business.services.filter((service) => service.isActive && clean(service.name)).slice(0, 8).map((service) => ({ id: String(service.id), name: service.name, description: clean(service.description) }));
  const services = realServices.length || !demoMode ? realServices : [
    { id: "demo-s1", name: "إدارة المشاريع", description: "حلول احترافية لإدارة وتنفيذ الأعمال." },
    { id: "demo-s2", name: "الخدمات التشغيلية", description: "دعم تشغيلي مرن يلائم احتياج المنشأة." },
    { id: "demo-s3", name: "الاستشارات", description: "خبرات عملية تساعد على اتخاذ القرار." },
  ];

  const realBranches = business.branches.filter((branch) => branch.isActive && clean(branch.name)).slice(0, 8).map((branch, index) => ({
    id: String(branch.id),
    name: branch.name,
    place: [branch.city, branch.district, branch.address].filter(Boolean).join("، ") || `الفرع ${index + 1}`,
    map: normalizedUrl(branch.googleMapsLink) || businessMap,
  }));
  const branches = realBranches.length || !demoMode ? realBranches : [
    { id: "demo-b1", name: "الفرع الرئيسي", place: "الرياض", map: businessMap },
    { id: "demo-b2", name: "فرع جدة", place: "جدة", map: businessMap },
  ];

  const contactPersons = Array.isArray((business as { contactPersons?: unknown[] }).contactPersons) ? business.contactPersons : [];
  let realContacts = contactPersons.filter((contact) => contact.isActive && clean(contact.name)).slice(0, 8).map((contact) => ({
    id: String(contact.id), name: contact.name, role: clean(contact.jobTitle) || clean(contact.department?.name) || "فريق العمل", image: normalizedUrl(contact.imageUrl), phone: digits(contact.phone), whatsapp: digits(contact.whatsapp),
  }));
  if (demoMode && realContacts.length === 0) {
    realContacts = business.departments.filter((department) => department.isActive).flatMap((department) => department.contacts.filter((contact) => contact.isActive && clean(contact.name)).map((contact) => ({
      id: String(contact.id), name: contact.name, role: clean(contact.jobTitle) || clean(department.name) || "فريق العمل", image: normalizedUrl(contact.imageUrl), phone: digits(contact.phone), whatsapp: digits(contact.whatsapp),
    }))).slice(0, 8);
  }
  const contacts = realContacts.length || !demoMode ? realContacts : [
    { id: "demo-c1", name: "محمد العتيبي", role: "ممثل مبيعات", image: null, phone, whatsapp },
    { id: "demo-c2", name: "سارة القحطاني", role: "خدمة العملاء", image: null, phone, whatsapp },
    { id: "demo-c3", name: "أحمد السالم", role: "مدير العمليات", image: null, phone, whatsapp },
  ];

  const activeHours = business.openingHours.find((item) => !item.isClosed && item.opensAt && item.closesAt);
  const workingHours = clean(business.workingHours) || (activeHours ? `${activeHours.opensAt} - ${activeHours.closesAt}` : (demoMode ? "السبت - الخميس، 9:00 ص - 6:00 م" : ""));
  const hasContactDetails = Boolean(phone || whatsapp || business.email || website || businessMap);
  const quickActions = [
    phone ? { key: "phone", href: `tel:${phone}`, icon: Phone, label: "اتصال" } : null,
    whatsapp ? { key: "whatsapp", href: `https://wa.me/${whatsapp}`, icon: MessageCircle, label: "واتساب", green: true } : null,
    businessMap ? { key: "map", href: businessMap, icon: MapPin, label: "الموقع" } : null,
    { key: "share", onClick: () => void share(), icon: Share2, label: "مشاركة" },
  ].filter(Boolean) as Array<{ key: string; href?: string; onClick?: () => void; icon: any; label: string; green?: boolean }>;

  const toggle = (key: PanelKey) => setOpenPanel((current) => current === key ? null : key);
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: business.name, url: publicUrl }); return; } catch {} }
    await navigator.clipboard?.writeText(publicUrl);
  }

  return <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff_0%,#ffffff_26%,#fbfaff_100%)] text-[#17131b] selection:bg-violet-100">
    <div dir="ltr" className="pointer-events-none sticky top-0 z-50 mx-auto h-0 w-full max-w-[580px]">
      <a href="/" aria-label="HEE - الصفحة الرئيسية" className="pointer-events-auto absolute left-3 top-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-white/95 px-2.5 shadow-[0_5px_20px_rgba(62,35,92,.08)] ring-1 ring-[#ece7f2] sm:left-4"><span className="text-[24px] font-black tracking-[-.08em] text-[#6f3bd2]">HEE</span><span className="h-1.5 w-1.5 rounded-full bg-[#9c6be8]" /></a>
      <button onClick={() => void share()} aria-label="مشاركة الصفحة" className="pointer-events-auto absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-[#6330bd] shadow-[0_5px_20px_rgba(62,35,92,.08)] ring-1 ring-[#ece7f2] transition active:scale-95 sm:right-4"><Share2 className="h-4 w-4" /></button>
    </div>

    <div className="mx-auto w-full max-w-[580px] px-3 pb-6 pt-[62px] sm:px-4">
      <div className="text-center text-[10px] font-bold tracking-wide text-[#766d7b]">هوية أعمال رقمية</div>
      <section className="pt-3 text-center">
        <div className="relative mx-auto w-fit"><div className="grid h-[96px] w-[96px] place-items-center overflow-hidden rounded-full border border-[#ebe5f0] bg-white shadow-[0_12px_34px_rgba(58,35,75,.09)]">{logo ? <img src={logo} alt={business.name} className="h-full w-full object-cover" /> : <Sparkles className="h-9 w-9 text-[#7040c9]" />}</div>{business.isVerified ? <span className="absolute -bottom-0.5 -left-0.5 grid h-7 w-7 place-items-center rounded-full bg-white shadow-sm"><BadgeCheck className="h-7 w-7 fill-[#3787f2] text-white" /></span> : null}</div>
        <div className="mt-3.5 flex items-center justify-center"><h1 className="max-w-[88%] text-[24px] font-black leading-[1.22] tracking-tight sm:text-[28px]">{business.name}</h1></div>
        {category ? <p className="mt-1.5 text-[13px] font-semibold text-[#6e6475]">{category}</p> : null}
        {(location || workingHours || demoMode) ? <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10.5px] text-[#625b68]">{location ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#6f3bd2]" />{location}</span> : null}{workingHours ? <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#6f3bd2]" />{workingHours}</span> : null}{demoMode ? <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />مفتوح الآن</span> : null}</div> : null}
        {about ? <p className="mx-auto mt-3.5 max-w-[500px] line-clamp-3 text-[12.5px] leading-6 text-[#5f5864] sm:text-[13px]">{about}</p> : null}
      </section>

      {demoMode ? <section className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-[#eee9f2] rounded-[18px] border border-[#ebe6ef] bg-white py-3 shadow-[0_8px_24px_rgba(55,35,70,.035)]"><Metric icon={Star} value="4.9" label="تقييم" /><Metric icon={UsersRound} value="1,250+" label="عميل" /><Metric icon={BriefcaseBusiness} value="8+" label="سنوات خبرة" /></section> : null}

      <section className="mt-2.5 grid gap-2" style={{ gridTemplateColumns: `repeat(${quickActions.length},minmax(0,1fr))` }}>{quickActions.map((action) => <QuickAction key={action.key} href={action.href} onClick={action.onClick} icon={action.icon} label={action.label} green={action.green} />)}</section>

      <section className="mt-3.5 space-y-2">
        {about ? <AccordionRow title="عن المنشأة" subtitle="نبذة مختصرة عنا" icon={Info} open={openPanel === "about"} onClick={() => toggle("about")}><p className="text-[13px] leading-7 text-[#625a68]">{about}</p></AccordionRow> : null}
        {services.length ? <AccordionRow title="خدماتنا" subtitle="ما نقدمه من خدمات" icon={BriefcaseBusiness} open={openPanel === "services"} onClick={() => toggle("services")}><div className="space-y-2">{services.map((service) => <div key={service.id} className="rounded-2xl bg-[#faf8fd] px-3.5 py-3"><b className="block text-[13px]">{service.name}</b>{service.description ? <p className="mt-1 text-[11px] leading-5 text-[#786f7d]">{service.description}</p> : null}</div>)}</div></AccordionRow> : null}
        {branches.length ? <AccordionRow title="فروعنا" subtitle="أماكن تواجدنا" icon={MapPin} open={openPanel === "branches"} onClick={() => toggle("branches")}><div className="space-y-2">{branches.map((branch) => branch.map ? <a key={branch.id} href={branch.map} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-[#faf8fd] px-3.5 py-3"><div><b className="block text-[13px]">{branch.name}</b><span className="mt-1 block text-[11px] text-[#786f7d]">{branch.place}</span></div><MapPin className="h-4 w-4 text-[#6f3bd2]" /></a> : <div key={branch.id} className="rounded-2xl bg-[#faf8fd] px-3.5 py-3"><b className="block text-[13px]">{branch.name}</b><span className="mt-1 block text-[11px] text-[#786f7d]">{branch.place}</span></div>)}</div></AccordionRow> : null}
        {contacts.length ? <AccordionRow title="فريق العمل" subtitle="تعرف على فريقنا" icon={UsersRound} open={openPanel === "team"} onClick={() => toggle("team")}><div className="space-y-1.5">{contacts.map((contact) => <div key={contact.id} className="flex items-center gap-3 rounded-2xl bg-[#faf8fd] px-3 py-2.5"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eee7f8]">{contact.image ? <img src={contact.image} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-[#6935bd]" />}</div><div className="min-w-0 flex-1"><b className="block truncate text-[12px]">{contact.name}</b><span className="block truncate text-[10px] text-[#776e7c]">{contact.role}</span></div>{contact.phone ? <a href={`tel:${contact.phone}`} aria-label={`اتصال بـ ${contact.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#6935bd]"><Phone className="h-3.5 w-3.5" /></a> : null}{contact.whatsapp ? <a href={`https://wa.me/${contact.whatsapp}`} aria-label={`واتساب ${contact.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-white text-emerald-600"><MessageCircle className="h-3.5 w-3.5" /></a> : null}</div>)}</div></AccordionRow> : null}
        {business.galleryItems.length ? <AccordionRow title="أعمالنا" subtitle="مشاريع نفخر بها" icon={Images} open={openPanel === "work"} onClick={() => toggle("work")}><div className="rounded-2xl bg-[#faf8fd] px-4 py-4 text-center"><Images className="mx-auto h-6 w-6 text-[#6f3bd2]" /><b className="mt-2 block text-[13px]">{business.galleryItems.length} من أعمالنا</b><p className="mt-1 text-[11px] text-[#786f7d]">نماذج مختارة من أعمال المنشأة.</p></div></AccordionRow> : null}
        {hasContactDetails ? <AccordionRow title="معلومات التواصل" subtitle="كل طرق التواصل معنا" icon={Headphones} open={openPanel === "contact"} onClick={() => toggle("contact")}><div className="divide-y divide-[#eee9f2] rounded-2xl bg-[#faf8fd] px-3.5">{phone ? <ContactLine icon={Phone} label="الهاتف" value={clean(business.phone) || phone} href={`tel:${phone}`} /> : null}{whatsapp ? <ContactLine icon={MessageCircle} label="واتساب" value={clean(business.whatsapp) || whatsapp} href={`https://wa.me/${whatsapp}`} green /> : null}{business.email ? <ContactLine icon={Mail} label="البريد الإلكتروني" value={business.email} href={`mailto:${business.email}`} /> : null}{website ? <ContactLine icon={Globe2} label="الموقع الإلكتروني" value={clean(business.website)} href={website} /> : null}{businessMap && location ? <ContactLine icon={MapPin} label="الموقع" value={location} href={businessMap} /> : null}</div></AccordionRow> : null}
      </section>

      <footer className="mt-6 border-t border-[#eee9f2] py-5 text-center"><a href="/" className="text-[25px] font-black tracking-[-.08em] text-[#6f3bd2]">HEE</a><p className="mt-1 text-[10px] font-bold text-[#69606f]">هوية أعمال رقمية</p><p className="mt-2 text-[9px] text-[#9a929f]">hee.sa</p></footer>
    </div>
  </main>;
}

function Metric({ icon: Icon, value, label }: { icon: any; value: string; label: string }) { return <div className="px-1 text-center"><Icon className="mx-auto h-4 w-4 text-[#6f3bd2]" /><b className="mt-1 block text-[13px]">{value}</b><span className="mt-0.5 block text-[9px] text-[#817985]">{label}</span></div>; }
function QuickAction({ href, onClick, icon: Icon, label, green }: { href?: string; onClick?: () => void; icon: any; label: string; green?: boolean }) { const className="flex min-h-[58px] flex-col items-center justify-center rounded-[16px] border border-[#ece7f1] bg-white text-[10px] font-bold shadow-[0_6px_18px_rgba(55,35,70,.03)] transition active:scale-[.98]"; const content=<><Icon className={`mb-1 h-[17px] w-[17px] ${green?"text-emerald-600":"text-[#6f3bd2]"}`} />{label}</>; return href?<a href={href} target={href.startsWith("http")?"_blank":undefined} rel={href.startsWith("http")?"noreferrer":undefined} className={className}>{content}</a>:<button onClick={onClick} className={className}>{content}</button>; }
function AccordionRow({ title, subtitle, icon: Icon, open, onClick, children }: { title: string; subtitle: string; icon: any; open: boolean; onClick: () => void; children: React.ReactNode }) { return <section className="overflow-hidden rounded-[17px] border border-[#ece7f1] bg-white shadow-[0_6px_19px_rgba(55,35,70,.03)]"><button onClick={onClick} aria-expanded={open} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-right"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f5f0fb] text-[#6f3bd2]"><Icon className="h-[17px] w-[17px]" /></span><span className="min-w-0 flex-1"><b className="block text-[13.5px]">{title}</b><span className="mt-0.5 block text-[9.5px] text-[#817985]">{subtitle}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-[#6f3bd2] transition-transform duration-200 ${open?"rotate-180":""}`} /></button>{open&&<div className="border-t border-[#f0ecf3] px-3.5 pb-3.5 pt-3">{children}</div>}</section>; }
function ContactLine({ icon: Icon, label, value, href, green }: { icon: any; label: string; value: string; href: string; green?: boolean }) { return <a href={href} target={href.startsWith("http")?"_blank":undefined} rel={href.startsWith("http")?"noreferrer":undefined} className="flex items-center gap-3 py-3"><Icon className={`h-4 w-4 shrink-0 ${green?"text-emerald-600":"text-[#6f3bd2]"}`} /><span className="min-w-0 flex-1"><b className="block text-[10px] text-[#756d79]">{label}</b><span className="mt-0.5 block truncate text-[12px] text-[#28232b]">{value}</span></span></a>; }
