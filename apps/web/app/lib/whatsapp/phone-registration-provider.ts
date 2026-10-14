export class PhoneRegistrationError extends Error {
  constructor(public readonly reason: string, public readonly diagnostic: { subcode?: number; traceId?: string } = {}) { super("WHATSAPP_PHONE_REGISTRATION_FAILED"); }
}
type Input = { version: string; token: string; wabaId: string; phoneNumberId: string; fetcher?: typeof fetch };
export function registrationFailureReason(value: unknown) {
  if (!value || typeof value !== "object") return "registration_failed";
  const error = value as Record<string, unknown>;
  // Classify known provider wording, but never return or persist its raw text.
  const details = error.error_data && typeof error.error_data === "object" ? (error.error_data as Record<string, unknown>).details : "";
  const text = [error.message, error.error_user_title, error.error_user_msg, details].filter(item => typeof item === "string").join(" ").toLowerCase();
  if (error.code === 100 && text.includes("invalid account linking")) return "account_linking_pending";
  if (error.code === 100 && /missing permission|permissions error/.test(text)) return "registration_permission_missing";
  if (error.code === 100 && /display name/.test(text) && /pending|approv/.test(text)) return "display_name_pending";
  if (error.code === 100 && text.includes("parameter pin is required")) return "registration_pin_required";
  return Number.isSafeInteger(error.code) ? `meta_${error.code}` : "registration_failed";
}
function providerError(value: unknown) {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const subcode = typeof data.error_subcode === "number" && Number.isSafeInteger(data.error_subcode) && data.error_subcode >= 0 ? data.error_subcode : undefined;
  const traceId = typeof data.fbtrace_id === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(data.fbtrace_id) ? data.fbtrace_id : undefined;
  return new PhoneRegistrationError(registrationFailureReason(value), { subcode, traceId });
}
function url(input: Input, path: string) {
  if (!/^v\d+\.\d+$/.test(input.version) || !/^\d{1,32}$/.test(input.wabaId) || !/^\d{1,32}$/.test(input.phoneNumberId)) throw new PhoneRegistrationError("invalid_asset");
  return `https://graph.facebook.com/${input.version}/${path}`;
}
async function read(input: Input, path: string) {
  const response = await (input.fetcher ?? fetch)(url(input, path), { headers: { authorization: `Bearer ${input.token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw providerError(data?.error);
  return data;
}
export async function inspectRegistration(input: Input) {
  // Prove the exact asset belongs to the connected WABA before any mutation.
  const list = await read(input, `${input.wabaId}/phone_numbers?fields=id&limit=100`);
  if (!Array.isArray(list?.data) || !list.data.some((phone: { id?: unknown }) => phone?.id === input.phoneNumberId)) throw new PhoneRegistrationError("asset_mismatch");
  const phone = await read(input, `${input.phoneNumberId}?fields=id,status,code_verification_status,platform_type,is_on_biz_app`);
  if (phone?.id !== input.phoneNumberId) throw new PhoneRegistrationError("asset_mismatch");
  if (phone.status === "CONNECTED" && phone.platform_type === "CLOUD_API") return "registered" as const;
  if (phone.is_on_biz_app !== false || phone.platform_type === "ON_PREMISE") throw new PhoneRegistrationError("requires_meta_onboarding");
  if (phone.code_verification_status !== "VERIFIED") throw new PhoneRegistrationError("phone_not_verified");
  if (phone.status !== "PENDING" && phone.status !== "DISCONNECTED") throw new PhoneRegistrationError("requires_meta_onboarding");
  return "needs_registration" as const;
}
export async function registerPhone(input: Input & { pin: string }) {
  if (!/^\d{6}$/.test(input.pin)) throw new PhoneRegistrationError("invalid_pin");
  if (await inspectRegistration(input) === "registered") return "registered" as const;
  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(url(input, `${input.phoneNumberId}/register`), { method: "POST", headers: { authorization: `Bearer ${input.token}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", pin: input.pin }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
  } catch { throw new PhoneRegistrationError("registration_uncertain"); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw providerError(data?.error);
  if (data?.success !== true) throw new PhoneRegistrationError("registration_uncertain");
  // This acknowledges registration, not message delivery. Never retry POST.
  return "registered" as const;
}
