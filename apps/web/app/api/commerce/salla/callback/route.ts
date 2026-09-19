import { after, NextResponse } from "next/server";

import { completeSallaAuthorization } from "../../../../lib/commerce/salla-oauth";
import { sallaAppOrigin } from "../../../../lib/commerce/salla-config";
import { getOwnedBusinessForRead } from "../../../../lib/ownership";
import { hasActiveBusinessSubscription } from "../../../../lib/subscription-entitlement";
import { syncSallaBookingOrders } from "../../../../lib/commerce/salla-order-sync";

export const maxDuration = 60;

function back(request: Request, result: string) {
  return NextResponse.redirect(new URL(`/dashboard/working-hours?salla=${encodeURIComponent(result)}`, sallaAppOrigin() || new URL(request.url).origin));
}

function single(params: URLSearchParams, key: string) {
  const values = params.getAll(key);
  return values.length === 1 ? values[0] : "";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("error")) return back(request, "cancelled");
  const state = single(params, "state");
  const code = single(params, "code");
  if (state.length < 32 || state.length > 128 || code.length < 8 || code.length > 4096) return back(request, "invalid-callback");
  const business = await getOwnedBusinessForRead();
  if (!business) return back(request, "forbidden");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) return back(request, "subscription-required");
  try {
    const connected = await completeSallaAuthorization({ businessId: business.id, userId: business.ownerId, state, code });
    after(async () => {
      try { await syncSallaBookingOrders({ businessId: business.id, integrationId: connected.integrationId, actorUserId: business.ownerId }); }
      catch (error) { console.error("[salla-oauth] initial_order_sync_failed", error instanceof Error ? error.message : "unknown"); }
    });
    return back(request, "connected");
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const safe = code === "SALLA_STORE_ALREADY_ASSIGNED"
      ? "store-assigned"
      : code === "SALLA_STORE_OWNERSHIP_MISMATCH"
        ? "store-mismatch"
        : code === "SALLA_OAUTH_SESSION_INVALID"
          ? "session-expired"
          : "activation-failed";
    return back(request, safe);
  }
}
