export type BotRule = { question: string; answer: string };
export type BotConfig = { name: string; mode: "rules" | "ai"; knowledge: string; rules: BotRule[]; handoffText: string; dailyLimit: number };
export const DEFAULT_BOT_CONFIG: BotConfig = { name: "مساعد خدمة العملاء", mode: "rules", knowledge: "", rules: [], handoffText: "سأترك استفسارك لفريق خدمة العملاء لمساعدتك.", dailyLimit: 50 };
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function normalizeBotQuestion(value: string) { return value.normalize("NFKC").toLowerCase().replace(/[ًٌٍَُِّْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
export function parseBotConfig(value: unknown): BotConfig {
  const v = record(value);
  const text = (key: string, max: number, required = true) => { const s = typeof v[key] === "string" ? v[key].trim() : ""; if ((required && !s) || s.length > max) throw new Error("BOT_CONFIG_INVALID"); return s; };
  if (!["rules", "ai"].includes(String(v.mode)) || !Array.isArray(v.rules) || v.rules.length > 30 || !Number.isInteger(v.dailyLimit) || Number(v.dailyLimit) < 1 || Number(v.dailyLimit) > 100) throw new Error("BOT_CONFIG_INVALID");
  const seen = new Set<string>();
  const rules = v.rules.map(item => { const r = record(item); if (typeof r.question !== "string" || typeof r.answer !== "string") throw new Error("BOT_CONFIG_INVALID"); const question = r.question.trim(), answer = r.answer.trim(), key = normalizeBotQuestion(question); if (!key || question.length > 160 || !answer || answer.length > 2000 || seen.has(key)) throw new Error("BOT_CONFIG_INVALID"); seen.add(key); return { question, answer }; });
  const knowledge = text("knowledge", 8000, false);
  if (v.mode === "ai" && knowledge.length < 30) throw new Error("BOT_KNOWLEDGE_REQUIRED");
  if (v.mode === "rules" && !rules.length) throw new Error("BOT_RULES_REQUIRED");
  return { name: text("name", 80), mode: v.mode as BotConfig["mode"], knowledge, rules, handoffText: text("handoffText", 500), dailyLimit: Number(v.dailyLimit) };
}
export function botRequestedHandoff(text: string) { return /(?:^| )(?:موظف|موظفة|بشري|انسان|شكوى|شكوي|human|agent|complaint)(?: |$)/.test(normalizeBotQuestion(text)); }
export function botOptOut(text: string) { return new Set(["stop", "unsubscribe", "cancel", "end", "quit", "الغاء", "توقف", "وقف", "ايقاف", "انهاء"]).has(normalizeBotQuestion(text)); }
export function ruleBotReply(config: BotConfig, question: string): { reply: string; handoff: boolean } | null {
  if (botRequestedHandoff(question)) return { reply: config.handoffText, handoff: true };
  const match = config.rules.find(rule => normalizeBotQuestion(rule.question) === normalizeBotQuestion(question));
  if (match) return { reply: match.answer, handoff: false };
  return config.mode === "rules" ? { reply: config.handoffText, handoff: true } : null;
}
export function parseBotAnswer(value: unknown, fallback: string) {
  const v = record(value);
  if (typeof v.handoff !== "boolean" || typeof v.reply !== "string" || !v.reply.trim() || v.reply.length > 2000) throw new Error("BOT_PROVIDER_OUTPUT_INVALID");
  return { reply: v.handoff ? fallback : v.reply.trim(), handoff: v.handoff };
}
