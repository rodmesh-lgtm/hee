"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type PublicSaveContactProps = {
  businessName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  publicUrl: string;
};

function escapeVcard(value: string) {
  return value.replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function PublicSaveContact({ businessName, phone, whatsapp, email, website, address, city, publicUrl }: PublicSaveContactProps) {
  const [status, setStatus] = useState<"idle" | "done">("idle");

  const downloadVCard = () => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVcard(businessName)}`,
      `ORG:${escapeVcard(businessName)}`,
      phone ? `TEL;TYPE=CELL:${escapeVcard(phone)}` : "",
      whatsapp ? `TEL;TYPE=WORK:${escapeVcard(whatsapp)}` : "",
      email ? `EMAIL:${escapeVcard(email)}` : "",
      website ? `URL:${escapeVcard(website)}` : "",
      publicUrl ? `NOTE:صفحة iR ${escapeVcard(publicUrl)}` : "",
      address || city ? `ADR:;;${escapeVcard(address ?? "")};${escapeVcard(city ?? "")}` : "",
      "END:VCARD",
    ].filter(Boolean);

    const blob = new Blob([lines.join("\n")], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contact.vcf";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("done");
    window.setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div>
      <button
        type="button"
        onClick={downloadVCard}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#e8ebf7] bg-white px-4 py-3 text-sm font-bold text-slate-700"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        حفظ جهة الاتصال
      </button>
      {status === "done" ? <p role="status" aria-live="polite" className="mt-2 text-center text-xs text-emerald-700">تم تنزيل جهة الاتصال</p> : null}
    </div>
  );
}
