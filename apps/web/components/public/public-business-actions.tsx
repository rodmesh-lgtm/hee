"use client";

import { useState } from "react";
import { BriefcaseBusiness, Download, Globe, MapPin, MessageCircle, Phone, Share2, Store } from "lucide-react";

export type ActionItem = {
  key: string;
  label: string;
  href?: string;
  external?: boolean;
  download?: string;
  icon: "whatsapp" | "call" | "directions" | "website" | "store" | "careers" | "share" | "save";
  onClick?: () => void;
};

type PublicBusinessActionsProps = {
  items: ActionItem[];
  darkMode?: boolean;
  className?: string;
  maxDesktopColumns?: number;
};

const iconMap = {
  whatsapp: MessageCircle,
  call: Phone,
  directions: MapPin,
  website: Globe,
  store: Store,
  careers: BriefcaseBusiness,
  share: Share2,
  save: Download,
} as const;

function actionGridClass(count: number, maxDesktopColumns?: number) {
  const desktopLimit = typeof maxDesktopColumns === "number" && maxDesktopColumns > 0 ? Math.max(1, Math.min(7, Math.floor(maxDesktopColumns))) : null;

  if (count === 1) {
    return "grid-cols-1";
  }

  if (count === 2) {
    return desktopLimit === 1 ? "grid-cols-2 lg:grid-cols-1" : "grid-cols-2 lg:grid-cols-2";
  }

  if (count === 3) {
    if (desktopLimit === 2) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-2";
    return "grid-cols-2 md:grid-cols-3";
  }

  if (count <= 4) {
    if (desktopLimit === 2) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-2";
    if (desktopLimit === 3) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  }

  if (count === 5) {
    if (desktopLimit === 2) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-2";
    if (desktopLimit === 3) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3";
    if (desktopLimit === 4) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
  }

  if (count === 6) {
    if (desktopLimit === 2) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-2";
    if (desktopLimit === 3) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3";
    if (desktopLimit === 4) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";
  }

  if (count === 7) {
    if (desktopLimit === 2) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-2";
    if (desktopLimit === 3) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3";
    if (desktopLimit === 4) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7";
  }

  if (desktopLimit === 2) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-2";
  if (desktopLimit === 3) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3";
  if (desktopLimit === 4) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
}

export function PublicBusinessActions({ items, darkMode = false, className = "", maxDesktopColumns }: PublicBusinessActionsProps) {
  const [copied, setCopied] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <section id="business-actions-section" className={`space-y-2 rounded-2xl border p-3 ${darkMode ? "border-white/10 bg-[#101a31]/78" : "border-[#e8ebf7] bg-[#fbfcff]"} ${className}`}>
      <div className={`grid auto-rows-fr gap-2 ${actionGridClass(items.length, maxDesktopColumns)}`}>
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          const sharedClass = `inline-flex h-full min-h-[52px] min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center text-sm font-bold leading-5 ${darkMode ? "border-white/12 bg-white/5 text-white" : "border-[#dfe5f6] bg-white text-[#24315f]"}`;

          if (item.href) {
            return (
              <a
                key={item.key}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer noopener" : undefined}
                download={item.download}
                className={sharedClass}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-normal break-words">{item.label}</span>
              </a>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={async () => {
                if (item.onClick) {
                  await item.onClick();
                  return;
                }

                if (item.icon === "share" && typeof window !== "undefined") {
                  try {
                    if (navigator.share) {
                      await navigator.share({ url: window.location.href, title: document.title });
                      return;
                    }

                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  } catch {
                    // Ignore cancelled share flow.
                  }
                }
              }}
              className={sharedClass}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal break-words">{item.label}</span>
            </button>
          );
        })}
      </div>
      {copied ? <p className={`text-xs ${darkMode ? "text-emerald-300" : "text-emerald-700"}`}>تم نسخ الرابط</p> : null}
    </section>
  );
}
