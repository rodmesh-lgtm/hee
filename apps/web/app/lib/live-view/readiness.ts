import { connectorOnline } from "./camera-profiles";

export const CAMERA_CHECK_MAX_AGE_MS = 15 * 60_000;
type Connector = { revokedAt: Date | null; enrolledAt: Date | null; lastSeenAt: Date | null };
type Station = {
  enabled: boolean; lastOnline: boolean; lastCheckedAt: Date | null;
  connectorId: string | null; connector?: Connector | null;
};

/** The same readiness decision is used by the dashboard and session creation. */
export function liveStationReadiness(station: Station, now = Date.now()) {
  if (!station.enabled) return { ready: false, label: "المحطة معطلة" };
  if (station.connectorId && (!station.connector || !connectorOnline(station.connector, now))) {
    return { ready: false, label: "جهاز الموقع غير متصل" };
  }
  if (!station.lastOnline || !station.lastCheckedAt) return { ready: false, label: "يلزم فحص البث" };
  const age = now - station.lastCheckedAt.getTime();
  if (!Number.isFinite(age) || age < -5_000 || age >= CAMERA_CHECK_MAX_AGE_MS) {
    return { ready: false, label: "أعد فحص البث" };
  }
  return { ready: true, label: "البث جاهز" };
}
