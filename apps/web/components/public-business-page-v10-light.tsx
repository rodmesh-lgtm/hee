"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  Globe2,
  Headphones,
  Images,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

type Service = { id: string | number; name?: string | null; description?: string | null; isActive?: boolean | null };
type Branch = { id: string | number; name?: string | null; city?: string | null; district?: string | null; address?: string | null; googleMapsLink?: string | null; isActive?: boolean | null };
type Contact = { id: string | number; name?: string | null; jobTitle?: string | null; imageUrl?: string | null; phone?: string | null; whatsapp?: string | null; isActive?: boolean | null; department?: { name?: string | null } | null };
type Department = { id: string | number; name?: string | null; isActive?: boolean | null; contacts?: Contact[] };
type OpeningHour = { dayOfWeek?: number | null; opensAt?: string | null; closesAt?: string | null; secondOpensAt?: string | null; secondClosesAt?: string | null; isClosed?: boolean | null };
type GalleryItem = { id: string | number; imageUrl?: string | null; title?: string | null; isActive?: boolean | null };

type PublicBusiness = {
  id: string | number;
  slug: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  businessCategory?: string | null;
  businessType?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  country?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  googleMapsLink?: string | null;
  workingHours?: string | null;
  isVerified?: boolean | null;
  primaryColor?: string | null;
  services?: Service[];
  branches?: Branch[];
  contactPersons?: Contact[];
  departments?: Department[];
  openingHours?: OpeningHour[];
  galleryItems?: GalleryItem[];
};

type Props = { business: PublicBusiness; qrDataUrl: string; publicUrl: string; demoMode?: boolean };
type PanelKey = "about" | "services" | "branches" | "team" | "work" | "contact";

const clean = (value?: string | null) => String(value ?? "").trim();
const digits = (value?: string | null) => clean(value).replace(/\D/g, "");

function assetUrl(value?: string | null) {
  const raw = clean(value);
  if (!raw) return null;
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  if (/^[\w@./-]+\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(raw)) return `/${raw.replace(/^\/+/, "")}`;
  return null;
}

function externalUrl(value?: string | null) {
  const raw = clean(value);
  if (!raw) return null;
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString(); } catch { return null; }
}

function isOpenNow(openingHours: OpeningHour[]) {
  if (!openingHours.length) return null;
  const now = new Date();
  const jsDay = now.getDay();
  const heeDay = jsDay === 0 ? 6 : jsDay - 1;
  const today = openingHours.find((item) => item.dayOfWeek === heeDay);
  if (!today || today.isClosed || !today.opensAt || !today.closesAt) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const inRange = (start?: string | null, end?: string | null) => Boolean(start && end && minutes >= toMinutes(start) && minutes <= toMinutes(end));
  return inRange(today.opensAt, today.closesAt) || inRange(today.secondOpensAt, today.secondClosesAt);
}

export function PublicBusinessPageV10Light({ business, publicUrl }: Props) {
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const phone = digits(business.phone);
  const whatsapp = digits(business.whatsapp);
  const location = [clean(business.city), clean(business.district)].filter(Boolean).join("، ");
  const category = clean(business.businessCategory) || clean(business.businessType);
  const about = clean(business.shortDescription) || clean(business.description);
  const logo = assetUrl(business.logoUrl);
  const cover = assetUrl(business.coverUrl);
  const website = externalUrl(business.website);
  const businessMap = externalUrl(business.googleMapsLink) || (location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : null);

  const services = (business.services ?? []).filter((service) => service.isActive !== false && clean(service.name)).slice(0, 8);
  const branches = (business.branches ?? []).filter((branch) => branch.isActive !== false && clean(branch.name)).slice(0, 8);

  const contacts = useMemo(() => {
    const direct = (business.contactPersons ?? []).filter((contact) => contact.isActive !== false && clean(contact.name));
    if (direct.length) return direct.slice(0, 8);
    return (business.departments ?? [])
      .filter((department) => department.isActive !== false)
      .flatMap((department) => (department.contacts ?? []).filter((contact) => contact.isActive !== false && clean(contact.name)).map((contact) => ({ ...contact, department: contact.department ?? { name: department.name } })))
      .slice(0, 8);
  }, [business.contactPersons, business.departments]);

  const gallery = (business.galleryItems ?? []).filter((item) => item.isActive !== false && assetUrl(item.imageUrl)).slice(0, 6);
  const openingHours = business.openingHours ?? [];
  const activeHours = openingHours.find((item) => !item.isClosed && item.opensAt && item.closesAt);
  const workingHours = clean(business.workingHours) || (activeHours ? `${activeHours.opensAt} - ${activeHours.closesAt}` : "");
  const openNow = isOpenNow(openingHours);

  const quickActions = [
    phone ? { key: "phone", href: `tel:${phone}`, icon: Phone, label: "اتصال" } : null,
    whatsapp ? { key: "whatsapp", href: `https://wa.me/${whatsapp}`, icon: MessageCircle, label: "واتساب", green: true } : null,
    businessMap ? { key: "map", href: businessMap, icon: MapPin, label: "الموقع" } : null,
    { key: "share", onClick: () => void share(), icon: Share2, label: "مشاركة" },
  ].filter(Boolean) as Array<{ key: string; href?: string; onClick?: () => void; icon: any; label: string; green?: boolean }>;

  const contactMethods = [phone, whatsapp, clean(business.email), website].filter(Boolean).length;
  const toggle = (key: PanelKey) => setOpenPanel((current) => current === key ? null : key);

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: business.name, url: publicUrl }); return; } catch {}
    }
    try { await navigator.clipboard?.writeText(publicUrl); } catch {}
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff_0%,#ffffff_26%,#fbfaff_100%)] text-[#17131b] selection:bg-violet-100">
      <div dir="ltr" className="pointer-events-none sticky top-0 z-50 mx-auto h-0 w-full max-w-[580px]">
        <a href="/" aria-label="HEE - الصفحة الرئيسية" className="pointer-events-auto absolute left-3 top-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-white/95 px-2.5 shadow-[0_5px_20px_rgba(62,35,92,.08)] ring-1 ring-[#ece7f2] sm:left-4"><span className="text-[24px] font-black tracking-[-.08em] text-[#6f3bd2]">HEE</span><span className="h-1.5 w-1.5 rounded-full bg-[#9c6be8]" /></a>
        <button onClick={() => void share()} aria-label="مشاركة الصفحة" className="pointer-events-auto absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-[#6330bd] shadow-[0_5px_20px_rgba(62,35,92,.08)] ring-1 ring-[#ece7f2] transition active:scale-95 sm:right-4"><Share2 className="h-4 w-4" /></button>
      </div>

      <div className="mx-auto w-full max-w-[580px] px-3 pb-6 pt-[62px] sm:px-4">
        <div className="text-center text-[10px] font-bold tracking-wide text-[#766d7b]">هوية أعمال رقمية</div>

        <section className="pt-3 text-center">
          {cover ? <div className="relative mb-[-48px] h-[112px] overflow-hidden rounded-[24px] border border-[#ece7f1] bg-[#f7f3fc] shadow-[0_10px_30px_rgba(55,35,70,.05)]"><div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(255,255,255,.28)_100%)]" /><img src={cover} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div> : null}

          <div className={`relative mx-auto w-fit ${cover ? "mt-0" : ""}`}>
            <div className="relative grid h-[96px] w-[96px] place-items-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_12px_34px_rgba(58,35,75,.11)] ring-1 ring-[#ebe5f0]">
              <Sparkles className="h-9 w-9 text-[#7040c9]" />
              {logo ? <img src={logo} alt={business.name} className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
            </div>
            {business.isVerified ? <span className="absolute -bottom-0.5 -left-0.5 grid h-7 w-7 place-items-center rounded-full bg-white shadow-sm"><BadgeCheck className="h-7 w-7 fill-[#3787f2] text-white" /></span> : null}
          </div>

          <div className="mt-3.5 flex items-center justify-center"><h1 className="max-w-[90%] text-[24px] font-black leading-[1.22] tracking-tight sm:text-[28px]">{business.name}</h1></div>
          {category ? <p className="mt-1.5 text-[13px] font-semibold text-[#6e6475]">{category}</p> : null}

          {(location || workingHours || openNow !== null) ? <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10.5px] text-[#625b68]">
            {location ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#6f3bd2]" />{location}</span> : null}
            {workingHours ? <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#6f3bd2]" />{workingHours}</span> : null}
            {openNow !== null ? <span className={`inline-flex items-center gap-1.5 font-bold ${openNow ? "text-emerald-600" : "text-slate-500"}`}><span className={`h-2 w-2 rounded-full ${openNow ? "bg-emerald-500" : "bg-slate-400"}`} />{openNow ? "مفتوح الآن" : "مغلق الآن"}</span> : null}
          </div> : null}

          {about ? <p className="mx-auto mt-3.5 max-w-[500px] line-clamp-3 text-[12.5px] leading-6 text-[#5f5864] sm:text-[13px]">{about}</p> : null}
        </section>

        <section className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-[#eee9f2] rounded-[18px] border border-[#ebe6ef] bg-white py-3 shadow-[0_8px_24px_rgba(55,35,70,.035)]">
          <Metric icon={BadgeCheck} value={business.isVerified ? "موثق" : "HEE"} label={business.isVerified ? "هوية معتمدة" : "هوية رقمية"} />
          <Metric icon={BriefcaseBusiness} value={String(services.length)} label="خدمات" />
          <Metric icon={MapPin} value={String(branches.length)} label="فروع" />
        </section>

        <section className="mt-2.5 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(quickActions.length, 1)},minmax(0,1fr))` }}>{quickActions.map((action) => <QuickAction key={action.key} href={action.href} onClick={action.onClick} icon={action.icon} label={action.label} green={action.green} />)}</section>

        <section className="mt-3.5 space-y-2">
          {about ? <AccordionRow title="عن المنشأة" subtitle="نبذة مختصرة عنا" icon={Info} open={openPanel === "about"} onClick={() => toggle("about")}><p className="text-[13px] leading-7 text-[#625a68]">{clean(business.description) || about}</p></AccordionRow> : null}

          <AccordionRow title="خدماتنا" subtitle={services.length ? `${services.length} خدمات متاحة` : "أضف خدماتك من لوحة التحكم"} icon={BriefcaseBusiness} open={openPanel === "services"} onClick={() => toggle("services")}>
            {services.length ? <div className="space-y-2">{services.map((service) => <div key={String(service.id)} className="rounded-2xl bg-[#faf8fd] px-3.5 py-3"><b className="block text-[13px]">{clean(service.name)}</b>{clean(service.description) ? <p className="mt-1 text-[11px] leading-5 text-[#786f7d]">{clean(service.description)}</p> : null}</div>)}</div> : <EmptyState text="لم تتم إضافة خدمات بعد." />}
          </AccordionRow>

          <AccordionRow title="فروعنا" subtitle={branches.length ? `${branches.length} فروع` : "بيانات الفروع"} icon={MapPin} open={openPanel === "branches"} onClick={() => toggle("branches")}>
            {branches.length ? <div className="space-y-2">{branches.map((branch) => {
              const place = [branch.city, branch.district, branch.address].filter(Boolean).join("، ");
              const map = externalUrl(branch.googleMapsLink) || businessMap;
              const content = <><div><b className="block text-[13px]">{clean(branch.name)}</b>{place ? <span className="mt-1 block text-[11px] text-[#786f7d]">{place}</span> : null}</div><MapPin className="h-4 w-4 text-[#6f3bd2]" /></>;
              return map ? <a key={String(branch.id)} href={map} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-[#faf8fd] px-3.5 py-3">{content}</a> : <div key={String(branch.id)} className="flex items-center justify-between rounded-2xl bg-[#faf8fd] px-3.5 py-3">{content}</div>;
            })}</div> : <EmptyState text="لم تتم إضافة فروع بعد." />}
          </AccordionRow>

          {contacts.length ? <AccordionRow title="فريق العمل" subtitle={`${contacts.length} من ممثلي المنشأة`} icon={UsersRound} open={openPanel === "team"} onClick={() => toggle("team")}><div className="space-y-1.5">{contacts.map((contact) => {
            const image = assetUrl(contact.imageUrl);
            const contactPhone = digits(contact.phone);
            const contactWhatsapp = digits(contact.whatsapp);
            return <div key={String(contact.id)} className="flex items-center gap-3 rounded-2xl bg-[#faf8fd] px-3 py-2.5"><div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eee7f8]"><UserRound className="h-5 w-5 text-[#6935bd]" />{image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}</div><div className="min-w-0 flex-1"><b className="block truncate text-[12px]">{clean(contact.name)}</b><span className="block truncate text-[10px] text-[#776e7c]">{clean(contact.jobTitle) || clean(contact.department?.name) || "فريق العمل"}</span></div>{contactPhone ? <a href={`tel:${contactPhone}`} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#6935bd]" aria-label="اتصال"><Phone className="h-3.5 w-3.5" /></a> : null}{contactWhatsapp ? <a href={`https://wa.me/${contactWhatsapp}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-full bg-white text-emerald-600" aria-label="واتساب"><MessageCircle className="h-3.5 w-3.5" /></a> : null}</div>;
          })}</div></AccordionRow> : null}

          {gallery.length ? <AccordionRow title="أعمالنا" subtitle={`${gallery.length} صور مختارة`} icon={Images} open={openPanel === "work"} onClick={() => toggle("work")}><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{gallery.map((item) => <div key={String(item.id)} className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#faf8fd]"><img src={assetUrl(item.imageUrl) || ""} alt={clean(item.title) || "من أعمال المنشأة"} className="h-full w-full object-cover" /></div>)}</div></AccordionRow> : null}

          <AccordionRow title="معلومات التواصل" subtitle={contactMethods ? `${contactMethods} وسائل تواصل` : "بيانات التواصل"} icon={Headphones} open={openPanel === "contact"} onClick={() => toggle("contact")}>
            {contactMethods || businessMap ? <div className="divide-y divide-[#eee9f2] rounded-2xl bg-[#faf8fd] px-3.5">{phone ? <ContactLine icon={Phone} label="الهاتف" value={clean(business.phone) || phone} href={`tel:${phone}`} /> : null}{whatsapp ? <ContactLine icon={MessageCircle} label="واتساب" value={clean(business.whatsapp) || whatsapp} href={`https://wa.me/${whatsapp}`} green /> : null}{business.email ? <ContactLine icon={Mail} label="البريد الإلكتروني" value={business.email} href={`mailto:${business.email}`} /> : null}{website ? <ContactLine icon={Globe2} label="الموقع الإلكتروني" value={clean(business.website)} href={website} /> : null}{businessMap ? <ContactLine icon={MapPin} label="الموقع" value={location || clean(business.address) || "فتح الخريطة"} href={businessMap} /> : null}</div> : <EmptyState text="لم تتم إضافة بيانات تواصل بعد." />}
          </AccordionRow>
        </section>

        <footer className="mt-6 border-t border-[#eee9f2] py-5 text-center"><a href="/" className="text-[25px] font-black tracking-[-.08em] text-[#6f3bd2]">HEE</a><p className="mt-1 text-[10px] font-bold text-[#69606f]">هوية أعمال رقمية</p><p className="mt-2 text-[9px] text-[#9a929f]">hee.sa</p></footer>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, value, label }: { icon: any; value: string; label: string }) { return <div className="px-1 text-center"><Icon className="mx-auto h-4 w-4 text-[#6f3bd2]" /><b className="mt-1 block text-[13px]">{value}</b><span className="mt-0.5 block text-[9px] text-[#817985]">{label}</span></div>; }

function QuickAction({ href, onClick, icon: Icon, label, green }: { href?: string; onClick?: () => void; icon: any; label: string; green?: boolean }) {
  const className = "flex min-h-[58px] flex-col items-center justify-center rounded-[16px] border border-[#ece7f1] bg-white text-[10px] font-bold shadow-[0_6px_18px_rgba(55,35,70,.03)] transition active:scale-[.98]";
  const content = <><Icon className={`mb-1 h-[17px] w-[17px] ${green ? "text-emerald-600" : "text-[#6f3bd2]"}`} />{label}</>;
  return href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className={className}>{content}</a> : <button onClick={onClick} className={className}>{content}</button>;
}

function AccordionRow({ title, subtitle, icon: Icon, open, onClick, children }: { title: string; subtitle: string; icon: any; open: boolean; onClick: () => void; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-[17px] border border-[#ece7f1] bg-white shadow-[0_6px_19px_rgba(55,35,70,.03)]"><button onClick={onClick} aria-expanded={open} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-right"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f5f0fb] text-[#6f3bd2]"><Icon className="h-[17px] w-[17px]" /></span><span className="min-w-0 flex-1"><b className="block text-[13.5px]">{title}</b><span className="mt-0.5 block text-[9.5px] text-[#817985]">{subtitle}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-[#6f3bd2] transition-transform duration-200 ${open ? "rotate-180" : ""}`} /></button>{open ? <div className="border-t border-[#f0ecf3] px-3.5 pb-3.5 pt-3">{children}</div> : null}</section>;
}

function ContactLine({ icon: Icon, label, value, href, green }: { icon: any; label: string; value: string; href: string; green?: boolean }) {
  return <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="flex items-center gap-3 py-3"><Icon className={`h-4 w-4 shrink-0 ${green ? "text-emerald-600" : "text-[#6f3bd2]"}`} /><span className="min-w-0 flex-1"><b className="block text-[10px] text-[#756d79]">{label}</b><span className="mt-0.5 block truncate text-[12px] text-[#28232b]">{value}</span></span></a>;
}

function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl bg-[#faf8fd] px-4 py-4 text-center text-[11px] leading-5 text-[#817985]">{text}</div>; }
