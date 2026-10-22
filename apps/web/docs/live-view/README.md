# INFRO Live — temporary customer viewing

## Implemented scope

`/dashboard/live-view` is the business workspace. Owners and explicitly authorized
`liveView` staff can register stations (bay / room / service area), probe the HLS
playlist, create a customer lease for 1–24 hours, and close a lease or disable a
station. Stations have a location label, not a dependency on workshop-specific
entities. Existing members receive no implicit camera permission.

`/watch/<256-bit-capability>` is the customer page. It works without an INFRO login
and uses native HLS or a lazily loaded hls.js player. This first release uses bearer
links: possession grants access. There is no OTP, automatic WhatsApp delivery,
work-order integration, camera discovery, recording, or automatic station transfer.
The operator can copy/share the link through WhatsApp. No messages are sent by the
application. A completed job must be closed using the dashboard; an external job
system's completion does not yet close a lease automatically.

The app stores only the capability digest. Raw links are returned once and must
not enter logs/analytics. The public page intentionally omits customer names and
job references. No-index/no-store/no-referrer applies to the page and media routes.
Reserve `watch` as a system slug; review any existing business/alias using this
slug before rollout (no automated rename of existing customer pages).

## Architecture and security boundary

Camera RTSP -> local MediaMTX -> private Caddy guard -> outbound Cloudflare Tunnel
-> INFRO authenticated HLS proxy -> customer browser.

No camera credentials or RTSP URLs go to the browser or the INFRO station record.
An opaque, globally unique station streamKey identifies the gateway path. Only a
platform-controlled HTTPS gateway origin can be fetched, with a server-held bearer
secret. Redirects, arbitrary tenant URLs, traversal and external playlist URIs are
rejected. Every child playlist/segment except the entry index requires a short
HMAC grant bound to its filename and customer lease, preventing guessed old asset
names. All media requests recheck database authorization before AND after bounded
upstream reads; closing/expiry/disable/deleted tenant deny subsequent requests.

Postgres composite foreign keys enforce that a lease and its station belong to the
same business. A partial unique index and station advisory lock prevent concurrent
open leases. Closing permanently ends a lease. Re-enabling a station cannot revive
old links. Station reuse waits 30 seconds after closure/expiry. An expired lease is
closed under the same lock before reuse. Do not replace this migration with
`prisma db push`; its partial index and checks are intentional.

### Revocation limits

Already-delivered video cannot be recalled. The player checks status every 3s and
clears playback on failure/closure; server-side segment authorization is the actual
control and does not depend on the browser. hls.js buffer targets are 4–6s, but
native players and suspended tabs may differ. There is **no promise of instantaneous
revocation**, no DRM and no guarantee against screen capture. Validate the actual
camera GOP, relay segment duration, tunnel buffering and client behavior. Keep the
old vehicle in place through closure and the 30-second reuse interval, then move
the next vehicle in. Never use a DVR/archive URL as this live input.

## Enable in an isolated Preview first

1. Apply committed migrations with `prisma migrate deploy` to the Preview DB.
2. Set `LIVE_VIEW_GATEWAY_ORIGIN=https://<dedicated-tunnel-hostname>` (origin only).
3. Set `LIVE_VIEW_GATEWAY_SECRET` to a generated random secret, at least 32 chars.
4. Set `LIVE_VIEW_ENABLED=true`. Without all three, customer viewing fails closed
   and session creation stays disabled; station registration remains available.
5. Add a station in INFRO and copy its opaque path from owner-only connection details.
6. Run the connector described below; map that path to its camera.
7. Probe the station, then create a short lease. A successful probe checks the HLS
   playlist only; it is not a certification of picture, audio or session isolation.

Do not migrate production or enable customer access until the pilot passes. The
feature is currently available to verified owners/explicit staff without a paid
entitlement; pricing/package gating must be decided before commercial launch.

## Pilot connector (one workshop, one gateway origin)

Use `ops/live-view/` on a dedicated Linux mini-PC in the workshop LAN. Docker must
reach the camera LAN IP. No inbound camera/router port-forwarding is necessary.
The mini-PC and internet must remain on.

- Copy `mediamtx.yml.example` to ignored `mediamtx.yml`. Replace the path with the
  exact station key and source with the camera's RTSP live substream. Use a camera
  account restricted to live reads. URL-encode special characters in credentials.
- Configure H.264, roughly 720p/10–15fps/0.5–1 Mbps for the initial trial, 2-second
  GOP, and **disable audio in the source stream**. Muting the HTML player is not an
  audio privacy boundary. If audio cannot be disabled, add a relay/transcoder that
  drops audio before offering the service. `record:false` disables connector
  recording; an existing NVR's independent retention policy is unaffected.
- Create a Cloudflare Tunnel with a dedicated HTTPS hostname whose origin is
  `http://guard:80`, and a default unmatched ingress of 404. Do not expose MediaMTX
  directly, create archive routes, cache HLS, or enable proxy access logging.
- Put `TUNNEL_TOKEN` and `LIVE_VIEW_GATEWAY_SECRET` into ignored `.env`, restrict
  `.env` and `mediamtx.yml` to the operator, then `docker compose up -d`.
- The origin secret must match INFRO. An unauthenticated request to the tunnel
  hostname must return 403. Camera URLs/secrets stay on this connector only.
- Supply the mini-PC with stable power, limited LAN permissions and OS updates.
  The compose is a pilot recipe; the Docker/tunnel/camera stack has not been run
  or verified against the client's physical equipment in this change.

A single gateway origin is configured per app environment in this release. It can
serve multiple tenants' unique station paths, but multiple independent workshop
connectors require a platform-controlled routing gateway/private network in front
of them. Do not claim automated multi-branch onboarding or install the same station
key at multiple sources. Future gateway registry credentials must remain platform
managed, encrypted and unavailable to tenant-controlled fetch URLs.

## Acceptance test with the first client

1. One camera and one station first; record camera/NVR model and actual upload rate.
2. Verify from an external phone network: picture, orientation, latency and no audio.
3. Verify an unauthorized tenant/staff member cannot list or modify this station.
4. Open two simultaneous customer-session requests: only one may succeed.
5. Keep the viewer open; close its lease. New media requests must return 410 and the
   player must stop; measure residual buffered playback on iOS and Android.
6. After the reuse interval, assign another customer. The first link, old playlists
   and old segment grants must remain unusable, even if the station is re-enabled.
7. Test expiry, disabled camera, tunnel loss and DB failure: deny viewing, never
   fall back to an unprotected stream or dummy feed.
8. Confirm framing excludes adjacent clients and sensitive areas; obtain the
   operator's approvals for the actual activity/site before rollout.

## Remaining before a wider launch

Physical pilot and browser QA; production deployment and migration; per-connector
routing/health; OTP if required; order/booking event integration; approved
transactional WhatsApp notification integration; package entitlements; usage limits
and retention policy for customer names/reference history. HLS currently traverses
the Next server and checks Postgres per asset; measure serverless bandwidth and DB
load. Consider a dedicated authorization/media edge for scale. No cost estimate or
capacity claim has been validated.
