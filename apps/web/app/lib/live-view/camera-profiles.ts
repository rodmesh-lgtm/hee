// Brand templates are suggestions, not a device certification. Firmware and NVR
// configuration vary; the local connector must verify the actual video stream.
export const CAMERA_BRANDS = { hikvision: "Hikvision / HiLook", dahua: "Dahua", axis: "Axis", reolink: "Reolink", custom: "ماركة أخرى / مسار يدوي" } as const;
export const LIVE_ACTIVITIES = {
  workshop: { label: "ورش ومراكز السيارات", station: "رافعة", reference: "مرجع الخدمة", kind: "bay" },
  laundry: { label: "مغاسل وخدمات العناية", station: "محطة خدمة", reference: "مرجع الخدمة", kind: "area" },
  maintenance: { label: "صيانة أجهزة ومعدات", station: "منضدة صيانة", reference: "مرجع الخدمة", kind: "area" },
  production: { label: "تصنيع وتجهيز طلبات", station: "منطقة تجهيز", reference: "مرجع الخدمة", kind: "area" },
  other: { label: "نشاط آخر", station: "محطة", reference: "مرجع الخدمة", kind: "area" },
} as const;
export type CameraBrand = keyof typeof CAMERA_BRANDS;
export function isPrivateCameraHost(host: string) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const p = host.split(".").map(Number); if (p.some(n => n > 255)) return false;
  // Canonical private LAN IPv4 only: no DNS rebinding, public cameras, loopback,
  // link-local metadata services, mapped IPv6 or alternate numeric encodings.
  if (p.some((n, i) => String(n) !== host.split(".")[i])) return false;
  return p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
}
export function cameraPath(brand: string, channel: number, profile: string, custom = "") {
  if (!Number.isInteger(channel) || channel < 1 || channel > 256 || !["main", "sub"].includes(profile)) throw new Error("INVALID_CHANNEL");
  if (brand === "hikvision") return `/Streaming/Channels/${channel}${profile === "sub" ? "02" : "01"}`;
  if (brand === "dahua") return `/cam/realmonitor?channel=${channel}&subtype=${profile === "sub" ? "1" : "0"}`;
  if (brand === "axis") return `/axis-media/media.amp?videocodec=h264&audio=0&camera=${channel}`;
  if (brand === "reolink") return `/h264Preview_${String(channel).padStart(2,"0")}_${profile}`;
  if (brand !== "custom" || !validCameraPath(custom)) throw new Error("INVALID_PATH");
  return custom;
}
export function validCameraPath(path: string) {
  if (/[?&](?:user(?:name)?|pass(?:word)?|token|auth(?:orization)?)=/i.test(path)) return false;
  return path.startsWith("/") && !path.startsWith("//") && path.length <= 300 && !/[\s\\#@]/.test(path) && !/%(?:00|0a|0d|2f|5c)/i.test(path) && !path.includes("://") && !path.split("?")[0].split("/").some(part => part === "." || part === "..");
}
export function cameraRtspUrl(input: { host: string; port: number; path: string; username: string; password: string }) {
  if (!isPrivateCameraHost(input.host) || !Number.isInteger(input.port) || input.port < 1 || input.port > 65535 || !validCameraPath(input.path)) throw new Error("INVALID_CAMERA");
  if (!input.username || input.username.length > 100 || !input.password || input.password.length > 256 || /[\r\n\0]/.test(input.username+input.password)) throw new Error("INVALID_CREDENTIAL");
  return `rtsp://${encodeURIComponent(input.username)}:${encodeURIComponent(input.password)}@${input.host}:${input.port}${input.path}`;
}
export const INPUT_STATUS_LABELS: Record<string,string> = { unconfigured: "لم تُضف بيانات الكاميرا", pending: "بانتظار جهاز الربط", probing: "جارٍ فحص المصدر", publishing: "المصدر يعمل", unreachable: "تعذر الاتصال أو رفضت بيانات الدخول", unsupported_codec: "غيّر ترميز الكاميرا إلى H.264", unavailable: "الكاميرا غير متاحة", stopped: "متوقفة" };
export function connectorOnline(value: { revokedAt: Date | null; enrolledAt: Date | null; lastSeenAt: Date | null }, now=Date.now()) {
  return !value.revokedAt && Boolean(value.enrolledAt && value.lastSeenAt && now - value.lastSeenAt.getTime() < 45_000);
}
