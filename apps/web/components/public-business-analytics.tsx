"use client";

import { useEffect } from "react";

function send(slug: string, eventType: string) {
  const body = JSON.stringify({ slug, eventType });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/public/analytics", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {}
  void fetch("/api/public/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

export function PublicBusinessAnalytics({ slug }: { slug: string }) {
  useEffect(() => {
    const viewKey = `hee:view:${slug}`;
    try {
      if (!sessionStorage.getItem(viewKey)) {
        sessionStorage.setItem(viewKey, "1");
        send(slug, "page_view");
      }
    } catch {
      send(slug, "page_view");
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a,button") : null;
      if (!target) return;
      const href = target instanceof HTMLAnchorElement ? target.href : "";
      const label = `${target.getAttribute("aria-label") || ""} ${target.textContent || ""}`;

      if (href.startsWith("tel:")) return send(slug, "phone_click");
      if (href.includes("wa.me/") || href.includes("whatsapp.com")) return send(slug, "whatsapp_click");
      if (/maps\.google|google\.com\/maps|maps\.app\.goo\.gl/i.test(href)) return send(slug, "map_click");
      if (/مشاركة|share/i.test(label)) return send(slug, "share_click");
      if (href && /^https?:/i.test(href) && !href.includes(location.host)) send(slug, "website_click");
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [slug]);

  return null;
}
