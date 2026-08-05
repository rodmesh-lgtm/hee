import { ArrowUpRight, FileText } from "lucide-react";
import type { CompanyProfileConfig } from "../../app/lib/page-modules";

type PublicCompanyProfileSectionProps = {
  companyProfile: CompanyProfileConfig;
  darkMode?: boolean;
};

export function PublicCompanyProfileSection({ companyProfile, darkMode = false }: PublicCompanyProfileSectionProps) {
  const pdfUrl = String(companyProfile.pdfUrl ?? "").trim();
  if (!pdfUrl || companyProfile.visible === false) {
    return null;
  }

  return (
    <section id="company-profile-section" className={`space-y-3 p-4 ${darkMode ? "rounded-[24px] border border-white/10 bg-slate-950/70" : "rounded-[18px] border border-[#e8ebf7] bg-white"}`}>
      <div className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-[#1f2552]"}`}>
        <FileText className={`h-5 w-5 ${darkMode ? "text-emerald-300" : "text-[#006C35]"}`} />
        <h2 className="text-xl font-black">{companyProfile.title?.trim() || "الملف التعريفي"}</h2>
      </div>

      <article className={`rounded-2xl border p-3 ${darkMode ? "border-white/10 bg-white/5" : "border-[#e8ebf7] bg-[#fbfcff]"}`}>
        {companyProfile.description?.trim() ? (
          <p className={`mb-3 text-sm leading-7 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
            {companyProfile.description}
          </p>
        ) : null}

        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold ${darkMode ? "border border-white/15 text-slate-100" : "border border-[#dbe2f7] text-[#354086]"}`}
        >
          {companyProfile.ctaLabel?.trim() || "عرض الملف التعريفي"}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </article>
    </section>
  );
}
