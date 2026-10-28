import { z } from "zod";
import { sallaLifecycleDate } from "./salla-lifecycle-domain";

export const SALLA_SUBSCRIPTION_EVENTS = ["app.trial.started", "app.trial.expired", "app.trial.canceled", "app.subscription.started", "app.subscription.expired", "app.subscription.canceled", "app.subscription.renewed"] as const;
const idSchema = z.string().regex(/^[1-9]\d{0,31}$/);
const featureKey = z.string().regex(/^[A-Za-z0-9_.:-]{1,80}$/).refine(key => !/token|secret|credential|password|authorization/i.test(key));
const receiptSchema = z.object({
  kind: z.literal("salla_subscription_receipt"), version: z.literal(1),
  event: z.enum(SALLA_SUBSCRIPTION_EVENTS), merchant: idSchema,
  appId: idSchema, subscriptionId: idSchema.nullable(),
  occurredAt: z.string().datetime().nullable(), startsAt: z.string().datetime().nullable(), endsAt: z.string().datetime().nullable(),
  itemType: z.enum(["plan", "addon", "trial", "unknown"]),
  planName: z.string().max(160).nullable(), planType: z.enum(["recurring", "one_time", "pay_as_you_go", "unknown"]),
  period: z.string().regex(/^\d{1,3}$/).nullable(), storeType: z.enum(["live", "development", "demo", "unknown"]),
  features: z.array(z.object({ key: featureKey, quantity: z.number().finite().min(0).max(1_000_000) })).max(50),
});
export type SallaSubscriptionReceipt = z.infer<typeof receiptSchema>;
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const id = (value: unknown) => typeof value === "string" || (typeof value === "number" && Number.isSafeInteger(value)) ? idSchema.safeParse(String(value)).data ?? null : null;

export function isSallaSubscriptionEvent(event: string): event is typeof SALLA_SUBSCRIPTION_EVENTS[number] {
  return (SALLA_SUBSCRIPTION_EVENTS as readonly string[]).includes(event);
}

/** Call only after raw HMAC verification. This receipt grants no entitlement. */
export function sallaSubscriptionReceipt(payload: unknown, expectedAppId: string, expectedMerchantId: string, legacyOffsetMinutes: number): SallaSubscriptionReceipt {
  const root = record(payload), data = record(root.data);
  if (typeof root.event !== "string" || !isSallaSubscriptionEvent(root.event) || id(data.id) !== expectedAppId || id(root.merchant) !== expectedMerchantId) throw new Error("SALLA_SUBSCRIPTION_IDENTITY_INVALID");
  const date = (value: unknown) => sallaLifecycleDate(typeof value === "string" && /^\d{4}-\d\d-\d\d$/.test(value) ? `${value} 00:00:00` : value, legacyOffsetMinutes)?.toISOString() ?? null;
  const features = (Array.isArray(data.features) ? data.features : []).slice(0, 50).flatMap(value => {
    const row = record(value), key = featureKey.safeParse(row.key);
    const quantity = typeof row.quantity === "number" ? row.quantity : typeof row.quantity === "string" && /^\d{1,7}(?:\.\d{1,4})?$/.test(row.quantity) ? Number(row.quantity) : NaN;
    return key.success && Number.isFinite(quantity) && quantity >= 0 && quantity <= 1_000_000 ? [{ key: key.data, quantity }] : [];
  });
  return receiptSchema.parse({
    kind: "salla_subscription_receipt", version: 1, event: root.event, merchant: expectedMerchantId, appId: expectedAppId,
    subscriptionId: id(data.subscription_id), occurredAt: date(root.created_at), startsAt: date(data.start_date), endsAt: date(data.end_date),
    itemType: root.event.startsWith("app.trial.") ? "trial" : data.item_type === "plan" || data.item_type === "addon" ? data.item_type : "unknown",
    planName: typeof data.plan_name === "string" ? data.plan_name.trim().slice(0, 160) : null,
    planType: ["recurring", "one_time", "pay_as_you_go"].includes(String(data.plan_type)) ? data.plan_type : "unknown",
    period: typeof data.plan_period === "string" || typeof data.plan_period === "number" ? /^\d{1,3}$/.test(String(data.plan_period)) ? String(data.plan_period) : null : null,
    storeType: ["live", "development", "demo"].includes(String(data.store_type)) ? data.store_type : "unknown", features,
  });
}

/** Revalidates old database rows and strips unrelated fields before admin display. */
export function readSallaSubscriptionReceipt(value: unknown) {
  const result = receiptSchema.safeParse(value);
  return result.success ? result.data : null;
}
