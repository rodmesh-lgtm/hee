export type SallaCampaignProduct = { id: string; name: string; price: string; url: string };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function mapSallaCampaignProduct(value: unknown): SallaCampaignProduct | null {
  const item = record(value);
  const id = String(item.id ?? "");
  if (!/^[1-9]\d{0,19}$/.test(id) || typeof item.name !== "string" || !item.name.trim() || item.status !== "sale" || item.is_available !== true) return null;
  const customerUrl = record(item.urls).customer;
  if (typeof customerUrl !== "string" || customerUrl.length > 1024) return null;
  let url: URL;
  try { url = new URL(customerUrl); } catch { return null; }
  // Links are rendered as text values only; the server never requests them.
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".") || /^(?:\d|\[)/.test(url.hostname) || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname)) return null;
  const price = record(item.taxed_price ?? item.price);
  const amount = price.amount;
  const currency = price.currency;
  const formatted = typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && typeof currency === "string" && /^[A-Z]{3}$/.test(currency)
    ? `${amount.toFixed(2)} ${currency}` : "";
  return { id, name: item.name.trim().slice(0, 200), price: formatted, url: url.href };
}
