export function normalizeAccountPhone(raw: string) {
  let value = raw.trim().replace(/[٠-٩۰-۹０-９]/g, digit => {
    const point = digit.charCodeAt(0);
    return String(point >= 0xff10 ? point - 0xff10 : point >= 0x06f0 ? point - 0x06f0 : point - 0x0660);
  }).replace(/[\s()-]/g, "");
  if (!value) return null;
  if (/^05\d{8}$/.test(value)) value = `966${value.slice(1)}`;
  value = value.replace(/^00/, "").replace(/^\+/, "");
  if (!/^[1-9]\d{7,14}$/.test(value)) throw new Error("invalid-phone");
  if (value.startsWith("966") && !/^9665\d{8}$/.test(value)) throw new Error("invalid-phone");
  return `+${value}`;
}

