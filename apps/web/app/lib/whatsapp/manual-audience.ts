import { normalizeE164 } from "./contact-domain";

export function parseManualAudience(value: unknown) {
  if (typeof value !== "string" || value.length > 300_000) throw new Error("WHATSAPP_CAMPAIGN_AUDIENCE_TOO_LARGE");
  const rows = value.split(/[\n\r,;،؛\t]+/).map(row => row.trim()).filter(Boolean);
  const phones = new Set<string>();
  let invalid = 0, duplicates = 0;
  for (const row of rows) {
    const latin = row.replace(/[٠-٩۰-۹]/g, digit => String("٠١٢٣٤٥٦٧٨٩".includes(digit) ? "٠١٢٣٤٥٦٧٨٩".indexOf(digit) : "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
    const compact = latin.replace(/[\s().-]/g, "");
    const phone = normalizeE164(/^966\d+$/.test(compact) ? `+${compact}` : latin, "966");
    if (!phone) invalid++;
    else if (phones.has(phone)) duplicates++;
    else phones.add(phone);
  }
  if (phones.size > 10_000) throw new Error("WHATSAPP_CAMPAIGN_AUDIENCE_TOO_LARGE");
  return { phones: [...phones], submitted: rows.length, invalid, duplicates };
}

export type ManualAudienceSummary = { submitted: number; invalid: number; duplicates: number; eligible: number; unavailable: number; optedOut: number; noConsent: number };

export function summarizeManualAudience(parsed: ReturnType<typeof parseManualAudience>, contacts: Array<{ id: string; phoneE164: string; optedOutAt: Date | null }>, consentPhones: Set<string>) {
  const byPhone = new Map(contacts.map(contact => [contact.phoneE164, contact]));
  const contactIds: string[] = [];
  const summary: ManualAudienceSummary = { submitted: parsed.submitted, invalid: parsed.invalid, duplicates: parsed.duplicates, eligible: 0, unavailable: 0, optedOut: 0, noConsent: 0 };
  for (const phone of parsed.phones) {
    const contact = byPhone.get(phone);
    if (!contact) summary.unavailable++;
    else if (contact.optedOutAt) summary.optedOut++;
    else if (!consentPhones.has(phone)) summary.noConsent++;
    else contactIds.push(contact.id);
  }
  summary.eligible = contactIds.length;
  return { contactIds, summary };
}
