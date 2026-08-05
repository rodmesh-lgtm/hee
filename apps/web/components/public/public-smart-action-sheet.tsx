"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import type { ActivityProfile } from "../../app/lib/activity-engine";
import { PublicActionDialog } from "./public-action-dialog";

type PublicSmartActionSheetProps = {
  businessName: string;
  activity: ActivityProfile;
  whatsapp: string | null;
  phone: string | null;
  buttonClassName: string;
  buttonLabel?: string;
  sheetTitle?: string;
  sheetDescription?: string;
  mode?: "request" | "inquiry";
  buttonStyle?: React.CSSProperties;
};

export function PublicSmartActionSheet({ businessName, activity, whatsapp, phone, buttonClassName, buttonLabel, sheetTitle, sheetDescription, mode = "request", buttonStyle }: PublicSmartActionSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const whatsappDigits = useMemo(() => {
    if (!whatsapp) return null;
    const digits = whatsapp.replace(/\D/g, "").trim();
    return digits || null;
  }, [whatsapp]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const nav = document.querySelector("[data-public-mobile-nav]") as HTMLElement | null;
    if (!nav) return;

    if (isOpen) {
      nav.style.setProperty("display", "none");
    } else {
      nav.style.removeProperty("display");
    }

    return () => {
      nav?.style.removeProperty("display");
    };
  }, [isOpen, mounted]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
        style={buttonStyle}
      >
        {whatsappDigits ? <MessageCircle className="h-[18px] w-[18px]" /> : <Phone className="h-[18px] w-[18px]" />}
        {buttonLabel ?? activity.primaryActionLabel}
      </button>

      {mounted ? (
        <PublicActionDialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          mode={mode}
          businessName={businessName}
          whatsapp={whatsapp}
          phone={phone}
          title={sheetTitle}
          description={sheetDescription}
          ctaLabel={buttonLabel ?? (mode === "request" ? "إرسال عبر واتساب" : "إرسال الاستفسار عبر واتساب")}
        />
      ) : null}
    </>
  );
}
