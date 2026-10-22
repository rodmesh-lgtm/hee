import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key(encoded: string) { const bytes=Buffer.from(encoded,"base64"); if(bytes.length!==32) throw new Error("CAMERA_KEY_INVALID"); return bytes; }
export function validCameraKey(encoded: string) { try { key(encoded); return true; } catch { return false; } }
export function sealCameraCredentials(value: { username: string; password: string }, encodedKey: string, businessId: string, stationId: string) {
  const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",key(encodedKey),iv);
  cipher.setAAD(Buffer.from(`infro-live-v1:${businessId}:${stationId}`));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url");
}
export function openCameraCredentials(value: string, encodedKey: string, businessId: string, stationId: string): { username: string; password: string } {
  const bytes=Buffer.from(value,"base64url"); if(bytes.length<29) throw new Error("CAMERA_ENVELOPE_INVALID");
  const decipher=createDecipheriv("aes-256-gcm",key(encodedKey),bytes.subarray(0,12));
  decipher.setAAD(Buffer.from(`infro-live-v1:${businessId}:${stationId}`)); decipher.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString("utf8"));
}
