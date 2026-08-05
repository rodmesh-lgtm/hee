import { ArrowUpRight, MapPin } from "lucide-react";

type PublicLocationSectionProps = {
  city: string | null;
  district: string | null;
  address: string | null;
  mapHref: string | null;
  title?: string;
  darkMode?: boolean;
  compact?: boolean;
};

export function PublicLocationSection({ city, district, address, mapHref, title = "الموقع", darkMode = false, compact = false }: PublicLocationSectionProps) {
  const hasPreciseLocation = Boolean(mapHref || address);
  if (!hasPreciseLocation) {
    return null;
  }
  const locationSummary = [district, city].filter(Boolean).join("، ");

  return (
    <section id="location-section" className={`${compact ? "p-3" : "p-4"} ${darkMode ? "rounded-[24px] border border-white/10 bg-slate-950/70 backdrop-blur" : "rounded-[18px] border border-[#e8ebf7] bg-white"}`}>
      <h2 className={`mb-3 text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
      <div className={`space-y-3 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
        {mapHref ? (
          <a
            href={mapHref}
            target="_blank"
            rel="noreferrer"
            className={`block overflow-hidden rounded-2xl border ${darkMode ? "border-white/10 bg-white/5" : "border-[#e8ebf7] bg-[#f8faff]"}`}
          >
            <div className="flex h-28 items-center justify-center bg-[linear-gradient(120deg,#eaf2ff_0%,#f2ecff_100%)] text-[#4f43d9]">
              <MapPin className="h-7 w-7" />
            </div>
          </a>
        ) : null}
        {address ? <p className={`rounded-2xl p-3 ${darkMode ? "border border-white/10 bg-white/5" : "border border-[#eef1fb] bg-[#fafbff]"}`}>{address}</p> : null}
        {locationSummary ? <p className={`rounded-2xl p-3 ${darkMode ? "border border-white/10 bg-white/5" : "border border-[#eef1fb] bg-[#fafbff]"}`}>{locationSummary}</p> : null}
        <div className="flex flex-wrap gap-2">
          {mapHref ? (
            <a href={mapHref} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${darkMode ? "border border-white/10 bg-white/5 text-white hover:bg-white/10" : "border border-[#ddd7ff] bg-[#f5f2ff] text-[#4f43d9]"}`}>
              <MapPin className="h-4 w-4" />
              الاتجاهات
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
