export class PhoneRegistrationError extends Error {
  constructor(public readonly reason: string) { super("WHATSAPP_PHONE_REGISTRATION_FAILED"); }
}
type Input = { version: string; token: string; wabaId: string; phoneNumberId: string; fetcher?: typeof fetch };
function url(input: Input, path: string) {
  if (!/^v\d+\.\d+$/.test(input.version) || !/^\d{1,32}$/.test(input.wabaId) || !/^\d{1,32}$/.test(input.phoneNumberId)) throw new PhoneRegistrationError("invalid_asset");
  return `https://graph.facebook.com/${input.version}/${path}`;
}
async function read(input: Input, path: string) {
  const response = await (input.fetcher ?? fetch)(url(input, path), { headers: { authorization: `Bearer ${input.token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new PhoneRegistrationError(Number.isSafeInteger(data?.error?.code) ? `meta_${data.error.code}` : "read_failed");
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
  if (!response.ok) throw new PhoneRegistrationError(Number.isSafeInteger(data?.error?.code) ? `meta_${data.error.code}` : "registration_failed");
  if (data?.success !== true) throw new PhoneRegistrationError("registration_uncertain");
  // This acknowledges registration, not message delivery. Never retry POST.
  return "registered" as const;
}
