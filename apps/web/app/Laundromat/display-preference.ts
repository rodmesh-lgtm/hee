"use client";
import { useSyncExternalStore } from "react";
const event = "infro-cashier-display-preference";
function subscribe(notify: () => void) {
  const pointer = window.matchMedia("(pointer: coarse)");
  window.addEventListener("storage", notify);
  window.addEventListener(event, notify);
  pointer.addEventListener("change", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(event, notify);
    pointer.removeEventListener("change", notify);
  };
}
export function useCashierDisplay(businessId: string) {
  const key = `infro:cashier:display:${businessId}`;
  const mode = useSyncExternalStore(subscribe, () => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved === "touch" || saved === "desktop") return saved;
    } catch { /* Device detection still works when storage is unavailable. */ }
    return window.matchMedia("(pointer: coarse)").matches ? "touch" : "desktop";
  }, () => "desktop");
  return [mode, (value: "touch" | "desktop") => {
    try { window.localStorage.setItem(key, value); } catch { return; }
    window.dispatchEvent(new Event(event));
  }] as const;
}
