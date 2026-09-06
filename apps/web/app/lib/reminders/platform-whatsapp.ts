import "server-only";

export type InfroReminderWhatsAppConfig = {
  graphVersion: string;
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
  ratePerMinute: number;
};

const value = (env: NodeJS.ProcessEnv, key: string) => String(env[key] ?? "").trim();

export function getInfroReminderWhatsAppConfig(env: NodeJS.ProcessEnv = process.env): InfroReminderWhatsAppConfig | null {
  if (value(env, "INFRO_REMINDER_WHATSAPP_ENABLED").toLowerCase() !== "true") return null;
  const graphVersion = value(env, "META_WHATSAPP_GRAPH_VERSION");
  const wabaId = value(env, "INFRO_REMINDER_WHATSAPP_WABA_ID");
  const phoneNumberId = value(env, "INFRO_REMINDER_WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = value(env, "INFRO_REMINDER_WHATSAPP_ACCESS_TOKEN");
  const templateName = value(env, "INFRO_REMINDER_WHATSAPP_TEMPLATE_NAME");
  const templateLanguage = value(env, "INFRO_REMINDER_WHATSAPP_TEMPLATE_LANGUAGE") || "ar";
  if (!/^v\d+\.\d+$/.test(graphVersion) || !/^\d{5,30}$/.test(wabaId) || !/^\d{5,30}$/.test(phoneNumberId) || accessToken.length < 20 || !/^[a-z0-9_]{1,512}$/.test(templateName) || !/^[A-Za-z0-9_-]{2,20}$/.test(templateLanguage)) return null;
  const parsedRate = Number(value(env, "INFRO_REMINDER_WHATSAPP_RATE_PER_MINUTE") || "30");
  const ratePerMinute = Number.isInteger(parsedRate) ? Math.min(Math.max(parsedRate, 1), 1000) : 30;
  return { graphVersion, wabaId, phoneNumberId, accessToken, templateName, templateLanguage, ratePerMinute };
}

export function infroReminderWhatsAppReady(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(getInfroReminderWhatsAppConfig(env));
}

export function infroReminderWhatsAppGraphUrl(config: Pick<InfroReminderWhatsAppConfig, "graphVersion" | "phoneNumberId">) {
  return `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
}
