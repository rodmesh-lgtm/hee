import type { CSSProperties } from "react";

export const IDENTITY_FONTS = ["infro", "cairo", "tajawal"] as const;
export type IdentityAppearance = { primary: string; accent: string; background: string; font: typeof IDENTITY_FONTS[number] };
export const DEFAULT_IDENTITY_APPEARANCE: IdentityAppearance = { primary: "#204f43", accent: "#b5a171", background: "#fdfdf9", font: "infro" };
export const IDENTITY_PALETTES = [
  { name: "انفرو", primary: "#204f43", accent: "#b5a171", background: "#fdfdf9" },
  { name: "كحلي", primary: "#243b64", accent: "#b6a175", background: "#f7f9fc" },
  { name: "عنابي", primary: "#6b2942", accent: "#bd946f", background: "#fcf8f6" },
  { name: "فيروزي", primary: "#086d70", accent: "#ba965e", background: "#f4faf9" },
  { name: "فحمي", primary: "#e0bb79", accent: "#b7c3d4", background: "#1c2228" },
] as const;
export function validIdentityColor(value: unknown): value is string { return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value); }
export function normalizeIdentityAppearance(raw: unknown): IdentityAppearance {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const color = (key: "primary" | "accent" | "background") => validIdentityColor(value[key]) ? value[key].toLowerCase() : DEFAULT_IDENTITY_APPEARANCE[key];
  return { primary: color("primary"), accent: color("accent"), background: color("background"), font: IDENTITY_FONTS.includes(value.font as IdentityAppearance["font"]) ? value.font as IdentityAppearance["font"] : "infro" };
}
function rgb(color: string) { return [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16)); }
function mix(base: string, tint: string, amount: number) { const a = rgb(base), b = rgb(tint); return "#" + a.map((value, i) => Math.round(value * (1 - amount) + b[i] * amount).toString(16).padStart(2, "0")).join(""); }
function luminance(color: string) { return rgb(color).map(value => { const v = value / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0); }
export function identityContrast(a: string, b: string) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); }
export function identityForeground(background: string) { return identityContrast(background, "#ffffff") >= identityContrast(background, "#000000") ? "#ffffff" : "#000000"; }
export function identityAppearanceStyle(raw: unknown): CSSProperties {
  const a = normalizeIdentityAppearance(raw), foreground = identityForeground(a.background);
  const ink = mix(foreground, a.primary, .12), card = mix(a.background, "#ffffff", .06);
  const mutedCandidate = mix(ink, a.background, .25);
  const muted = identityContrast(mutedCandidate, card) >= 4.5 ? mutedCandidate : foreground;
  return {
    fontFamily: "var(--identity-font)",
    "--primary": a.primary, "--on-primary": identityForeground(a.primary), "--accent": a.accent,
    "--paper": a.background, "--card": card, "--ink": identityContrast(ink, card) >= 4.5 ? ink : foreground,
    "--muted": muted, "--line": mix(a.background, foreground, .16), "--soft": mix(a.background, a.primary, .08),
    "--canvas": mix(a.background, foreground, .04),
    "--identity-font": a.font === "cairo" ? 'var(--font-identity-cairo), sans-serif' : a.font === "tajawal" ? 'var(--font-identity-tajawal), sans-serif' : 'var(--font-ibm-plex-sans-arabic), sans-serif',
  } as CSSProperties;
}
