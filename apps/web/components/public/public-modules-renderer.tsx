import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { PublicBusinessData, PublicService, PublicWorkingHour } from "./types";
import { PublicAboutSection } from "./public-about-section";
import { PublicHoursSection } from "./public-hours-section";
import { PublicLocationSection } from "./public-location-section";
import { PublicProductsSection } from "./public-products-section";
import { PublicServicesSection } from "./public-services-section";
import { PublicSocialSection } from "./public-social-section";
import { PublicSmartActionSheet } from "./public-smart-action-sheet";
import type { PageModuleState } from "../../app/lib/page-modules";
import { PAGE_MODULE_LABELS } from "../../app/lib/page-modules";
import { getActivityProfile } from "../../app/lib/activity-engine";

type PublicModulesRendererProps = {
  business: PublicBusinessData;
  modules: PageModuleState[];
  accentColor: string;
  mapHref: string | null;
  openStatus: { label: string | null; detail: string | null };
  products: PublicBusinessData["products"];
  services: PublicService[];
  hours: PublicWorkingHour[];
  socialLinks: Array<{ label: string; href: string }>;
  darkMode?: boolean;
};

function ContactModule({
  title,
  business,
  darkMode = false,
  hideWhatsappAction = false,
  hasPreciseLocation = false,
}: {
  title: string;
  business: PublicBusinessData;
  darkMode?: boolean;
  hideWhatsappAction?: boolean;
  hasPreciseLocation?: boolean;
}) {
  if (!business.whatsapp && !business.phone && !business.website && !hasPreciseLocation) {
    return null;
  }

  const whatsappHref = business.whatsapp ? `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(`مرحباً ${business.name}، أود التواصل معكم.`)}` : null;

  return (
    <section id="contact-section" className={`p-4 ${darkMode ? "rounded-[28px] border border-white/10 bg-slate-950/70 backdrop-blur" : "rounded-[20px] border border-[#e8ebf7] bg-white"}`}>
      <h2 className={`mb-3 text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {whatsappHref ? (
          hideWhatsappAction ? null : (
          <a href={whatsappHref} target="_blank" rel="noreferrer noopener" className={`inline-flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-bold ${darkMode ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            <span>واتساب</span>
            <MessageCircle className="h-4 w-4" />
          </a>
          )
        ) : null}
        {business.phone ? (
          <a href={`tel:${business.phone}`} className={`inline-flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-bold ${darkMode ? "border border-white/15 bg-white/5 text-slate-200" : "border border-[#e8ebf7] bg-[#fafbff] text-slate-700"}`}>
            <span>اتصال</span>
            <Phone className="h-4 w-4" />
          </a>
        ) : null}
        {hasPreciseLocation ? (
          <a href={business.googleMapsLink ?? "#location-section"} className={`inline-flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-bold ${darkMode ? "border border-white/15 bg-white/5 text-slate-200" : "border border-[#e8ebf7] bg-[#fafbff] text-slate-700"}`}>
            <span>الموقع</span>
            <MapPin className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

function RequestModule({
  module,
  business,
  inquiry,
  darkMode = false,
}: {
  module: PageModuleState;
  business: PublicBusinessData;
  inquiry: boolean;
  darkMode?: boolean;
}) {
  const profile = inquiry ? getActivityProfile("GENERAL") : getActivityProfile(business.businessType);
  const ctaLabel = module.config.ctaLabel ?? (inquiry ? "استفسر الآن" : profile.primaryActionLabel);
  const sheetTitle = module.config.sheetTitle ?? (inquiry ? PAGE_MODULE_LABELS.inquiry : PAGE_MODULE_LABELS.request);
  const sheetDescription = module.config.sheetDescription ?? (inquiry ? "اكتب ملاحظتك وسيتم تجهيز رسالة واتساب جاهزة." : "أرسل التفاصيل وسيتم فتح واتساب مباشرة.");

  return (
    <section id={inquiry ? "inquiry-section" : "request-section"} className={`p-4 ${darkMode ? "rounded-[28px] border border-white/10 bg-slate-950/70 backdrop-blur" : "rounded-[20px] border border-[#e8ebf7] bg-white"}`}>
      <div className="space-y-2">
        <h2 className={`text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{module.config.title ?? (inquiry ? PAGE_MODULE_LABELS.inquiry : PAGE_MODULE_LABELS.request)}</h2>
        <p className={`text-sm leading-7 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{sheetDescription}</p>
      </div>
      <div className="mt-4">
        <PublicSmartActionSheet
          businessName={business.name}
          activity={profile}
          whatsapp={business.whatsapp}
          phone={business.phone}
          mode={inquiry ? "inquiry" : "request"}
          buttonLabel={ctaLabel}
          sheetTitle={sheetTitle}
          sheetDescription={sheetDescription}
          buttonClassName="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 px-4 text-sm font-black text-white shadow-[0_16px_40px_rgba(79,70,229,0.28)]"
        />
      </div>
    </section>
  );
}

export function PublicModulesRenderer({ business, modules, accentColor, mapHref, openStatus, products, services, hours, socialLinks, darkMode = false }: PublicModulesRendererProps) {
  const ordered = [...modules].filter((module) => module.enabled).sort((left, right) => left.sortOrder - right.sortOrder);
  const hasPrimaryContactModule = ordered.some((module) => module.id === "request" || module.id === "inquiry");
  const hasPreciseLocation = Boolean(mapHref || business.googleMapsLink || business.address);

  if (ordered.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {ordered.map((module) => {
        switch (module.id) {
          case "products":
            return <PublicProductsSection key={module.id} products={products} businessName={business.name} whatsapp={business.whatsapp} phone={business.phone} accentColor={accentColor} title={module.config.title ?? PAGE_MODULE_LABELS.products} darkMode={darkMode} />;
          case "services":
            return <PublicServicesSection key={module.id} services={services} accentColor={accentColor} whatsapp={business.whatsapp} phone={business.phone} businessName={business.name} title={module.config.title ?? PAGE_MODULE_LABELS.services} darkMode={darkMode} />;
          case "request":
            return <RequestModule key={module.id} module={module} business={business} inquiry={false} darkMode={darkMode} />;
          case "inquiry":
            return <RequestModule key={module.id} module={module} business={business} inquiry darkMode={darkMode} />;
          case "location":
            return <PublicLocationSection key={module.id} city={business.city} district={business.district} address={business.address} mapHref={mapHref} title={module.config.title ?? PAGE_MODULE_LABELS.location} darkMode={darkMode} />;
          case "hours":
            return <PublicHoursSection key={module.id} hours={hours} statusLabel={openStatus.label} statusDetail={openStatus.detail} fallbackText={business.workingHours} accentColor={accentColor} title={module.config.title ?? PAGE_MODULE_LABELS.hours} darkMode={darkMode} />;
          case "about":
            return <PublicAboutSection key={module.id} description={business.description} businessType={business.businessType} city={business.city} district={business.district} address={business.address} establishedYear={business.establishedYear} website={business.website} phone={business.phone} whatsapp={business.whatsapp} isVerified={business.isVerified} statusLabel={openStatus.label} title={module.config.title ?? PAGE_MODULE_LABELS.about} darkMode={darkMode} />;
          case "contact":
            return (
              <ContactModule
                key={module.id}
                title={module.config.title ?? PAGE_MODULE_LABELS.contact}
                business={business}
                darkMode={darkMode}
                hideWhatsappAction={hasPrimaryContactModule}
                hasPreciseLocation={hasPreciseLocation}
              />
            );
          case "links":
            return <PublicSocialSection key={module.id} links={socialLinks} title={module.config.title ?? PAGE_MODULE_LABELS.links} darkMode={darkMode} />;
          default:
            return null;
        }
      })}
    </div>
  );
}