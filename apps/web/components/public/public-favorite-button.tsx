"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

type PublicFavoriteButtonProps = {
  businessId: string;
  businessName: string;
  variant?: "pill" | "circle";
  className?: string;
};

type FavoriteEntry = {
  id: string;
  name: string;
  savedAt: string;
};

const KEY = "hee_public_favorites";

function readFavorites() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [] as FavoriteEntry[];
    const parsed = JSON.parse(raw) as FavoriteEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as FavoriteEntry[];
  }
}

export function PublicFavoriteButton({ businessId, businessName, variant = "pill", className = "" }: PublicFavoriteButtonProps) {
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState(false);

  const label = useMemo(() => (saved ? "تم الحفظ" : "حفظ"), [saved]);

  useEffect(() => {
    setSaved(readFavorites().some((item) => item.id === businessId));
  }, [businessId]);

  const toggleFavorite = () => {
    const favorites = readFavorites();
    if (saved) {
      const next = favorites.filter((item) => item.id !== businessId);
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaved(false);
      return;
    }

    const next: FavoriteEntry[] = [{ id: businessId, name: businessName, savedAt: new Date().toISOString() }, ...favorites.filter((item) => item.id !== businessId)];
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, 100)));
    setSaved(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1800);
  };

  const isCircle = variant === "circle";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleFavorite}
        aria-label={saved ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        className={`${isCircle ? "inline-flex h-11 w-11 items-center justify-center rounded-full" : "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold"} border transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${saved ? "border-amber-400/50 bg-amber-500/15 text-amber-200" : "border-white/15 bg-white/5 text-slate-100"} ${className}`}
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        {!isCircle ? <span>{label}</span> : null}
      </button>
      {flash ? <span className="text-xs text-emerald-300">تمت الإضافة للمفضلة</span> : null}
    </div>
  );
}
