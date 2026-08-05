"use client";

import { Globe2 } from "lucide-react";

type PublicAboutSectionProps = {
  description: string | null;
  businessType: string;
  city: string | null;
  district: string | null;
  address: string | null;
  establishedYear: number | null;
  website?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  isVerified?: boolean;
  statusLabel?: string | null;
  title?: string;
  darkMode?: boolean;
};

export function PublicAboutSection({
  description,
  website,
  title = "عن النشاط",
  darkMode = false,
}: PublicAboutSectionProps) {
  const longDescription = (description ?? "").trim();
  const websiteHref = (website ?? "").trim();

  if (!longDescription && !websiteHref) {
    return null;
  }

  return (
    <section className={`p-4 ${darkMode ? "rounded-[28px] border border-white/10 bg-slate-950/70 backdrop-blur" : "rounded-[20px] border border-[#e8ebf7] bg-white"}`}>
      <h2 className={`mb-3 text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
      <div className={`space-y-3 text-sm leading-7 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
        {longDescription ? <p className={`max-w-[90ch] whitespace-pre-line p-3 ${darkMode ? "rounded-2xl border border-white/10 bg-white/5" : "rounded-2xl border border-[#eef1fb] bg-[#fafbff]"}`}>{longDescription}</p> : null}

        {websiteHref ? (
          <a
            href={websiteHref}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${darkMode ? "border border-white/15 bg-white/5 text-slate-100" : "border border-[#dfe4f8] bg-[#f8faff] text-[#3f4aa8]"}`}
          >
            <Globe2 className="h-4 w-4" />
            زيارة الموقع الإلكتروني
          </a>
        ) : null}
      </div>
    </section>
  );
}
