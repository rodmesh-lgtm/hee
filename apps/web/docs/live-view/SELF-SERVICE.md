# INFRO Live self-service setup

## Product contract

All configuration, camera/model search, station assignment, customer link creation,
link replacement and service completion live in the customer's INFRO account.
No external workshop/accounting application is required. `/dashboard/live-view`
handles sessions; `/dashboard/live-view/setup` handles sites and cameras. Setup is
owner-only; explicitly authorized `liveView` staff can manage sessions without
receiving camera credentials or connector pairing rights.

Activity presets: automotive workshop, laundry/care, equipment maintenance,
production/order preparation, other. A connector represents one physical site;
stations receive the site's activity-appropriate label and location. Camera
compatibility depends on protocol/codec/firmware, not on activity or a text model
match. Model and brand are searchable metadata, **not device certification**.

## Actual connection flow

1. Owner adds a named site/activity and receives a random one-use pairing code,
   valid 10 minutes. Codes are shown once; only SHA-256 digests are persisted.
2. Owner/installer downloads the generic connector from
   `/connectors/infro-live-connector.mjs`. On a dedicated machine on the camera LAN,
   install Node 20+, FFmpeg and FFprobe, then run
   `node infro-live-connector.mjs`. Enter the trusted INFRO HTTPS origin and pairing
   code at the prompt. There are no camera passwords in installation commands.
3. Enrollment atomically exchanges the code for a random scoped connector token.
   The local token is written to `~/.infro-live/connector.json` with mode 0600 in a
   0700 directory. INFRO stores only its digest. Protect the machine and account;
   the token authorizes delivery of that site's encrypted-at-rest camera settings.
4. Owner adds a station from INFRO: site, station name, camera/NVR/DVR, brand/model,
   LAN IPv4, RTSP port, channel, main/sub stream, camera username/password. Custom
   RTSP paths are accepted for other vendors. DNS/public/loopback/link-local camera
   hosts are rejected in BOTH server and agent. The server never fetches a camera
   LAN URL; it sends scoped config to the local connector over authenticated TLS.
5. Every 10 seconds (plus report time, bounded by request deadlines), the connector
   synchronizes the site's enabled camera configuration. FFprobe checks the source
   and requires H.264. FFmpeg copies the video and **drops all audio, subtitles and
   data** before publishing outbound using RTMPS. No router port-forward is needed
   at the customer site. Input and publish processes have no shell interpolation.
6. The server validates actual relay HLS availability before marking video ready.
   Connector reports alone cannot claim that a stream is viewable. Owner can request
   a fresh source probe, edit settings, disable/disconnect cameras, revoke a site
   or re-pair its connector. Editing an active session's source is refused.
7. Session creation/search/close and bearer-link replacement are entirely in INFRO.
   There is no dependency on external orders/events. Replacing a link invalidates
   its previous token without extending the session's expiry.

Do not use the old, per-site MediaMTX configuration recipe for self-service sites.
The new connector sends each site to the centrally managed relay below. The old
legacy station flow remains supported for preconfigured pilots.

## Central platform configuration — not tenant configuration

Set these only in the INFRO environment and central relay:

- `LIVE_VIEW_ENABLED=true`
- `LIVE_VIEW_GATEWAY_ORIGIN=https://<guarded-HLS-hostname>`
- `LIVE_VIEW_GATEWAY_SECRET`: random, at least 32 characters (use base64url)
- `LIVE_VIEW_PUBLISH_ORIGIN=rtmps://<public-relay-TLS-hostname>:1936`
- `LIVE_VIEW_RELAY_AUTH_SECRET`: a different random secret, at least 32 characters
- `LIVE_VIEW_CREDENTIAL_KEY`: base64 encoding of exactly 32 random bytes

Camera credentials use AES-256-GCM with random IV and business/station-bound AAD.
They are never returned to the owner's browser after saving, included in audit
metadata, or embedded in shared viewing links. Only the enrolled connector for
that business/site can retrieve decrypted source settings. Do not rotate/drop the
encryption key until stored credentials have been migrated or re-entered. This
initial version has one encryption-key slot, not a multi-key rotation service.

Apply both committed migrations with `prisma migrate deploy`; preserve the partial
unique session index and all checks. Do not use `prisma db push` as a substitute.
No production migration or deployment was performed as part of implementation.

## Central relay deployment recipe

`ops/live-view/compose-relay.yml` starts MediaMTX v1.21.2, a private Caddy auth/media
guard and an outbound Cloudflare Tunnel. This is operated by INFRO, not customers.

1. Install a valid, publicly trusted, renewable TLS certificate matching the RTMPS
   hostname (DNS-only, unless a TCP proxy is explicitly provisioned) in ignored `ops/live-view/relay-certs/{fullchain.pem,privkey.pem}`.
   Protect permissions and arrange renewal/restart; the agent verifies TLS.
2. Supply the two shared secrets and `TUNNEL_TOKEN` through ignored `.env`.
   The tunnel hostname must route ONLY to `http://guard:80`, with unmatched ingress
   404. Never expose `media:8888` or `guard:8081`, or cache HLS traffic.
3. Open central relay TCP 1936 for RTMPS ingestion. `overridePublisher:false`
   prevents another publisher taking over an active stream. Do not expose plaintext
   RTMP, archive playback, recording, API or metrics ports.
4. MediaMTX calls the internal auth guard; it forwards to
   `https://ir.sa/api/live-view/relay/auth` with `X-Infro-Relay-Secret`. For isolated
   Preview, change that fixed platform origin in RelayCaddyfile to the matching
   trusted Preview origin; never take it from tenant input.
5. Each publish password is HMAC-bound to connector ID, opaque stream path and a
   five-minute expiry. Auth checks current station/connector ownership, enablement,
   tenant deletion and connector heartbeat. It returns MediaMTX's `expireAt` so the
   publisher socket also ends when the grant expires. The agent restarts publishers
   every four minutes with a fresh grant. **Brief renewal interruptions are possible**;
   measure them before advertising continuous viewing.
6. HLS reads are accepted only from the server-held guard credential, in addition
   to INFRO's per-customer media authorization. Read access over RTMP is denied.
7. Run `docker compose -f compose-relay.yml up -d` from `ops/live-view`.
   Verify unauthenticated HLS is 403, bad publish is denied, expired publish actually
   disconnects, camera audio is absent, and customer link closure denies segments.

The relay/tunnel/certificate stack still requires an actual host and acceptance
test; the code/configuration is not evidence that a relay is provisioned. No relay,
RTSP camera, NVR or end-to-end browser was available during implementation.

## Revocation, source edits and failures

Pair reset and revoke invalidate connector tokens, rotate station stream paths,
close associated customer sessions and clear live checks in one transaction. Camera
edits rotate the stream path and configuration revision, retire expired leases and
refuse edits during an active lease. Disconnect wipes the encrypted camera password.
Reports match site + business + station + revision + probe nonce after network I/O;
an old probe cannot certify a newly configured source. Enrollment is serialized
and consumes the pairing code once, even under concurrent requests.

A connector that has not synchronized for 45 seconds cannot authorize customer
viewing. The normal agent stops publishers on sync failure/revocation. A malicious
or disconnected publisher may persist until its five-minute relay grant expires,
but customer access is independently denied by current DB authorization. Delivered
video buffers cannot be recalled; keep the 30-second station reuse interval and
physical vehicle/customer handover procedure from README.md.

## Limits and operations

20 connector records per business, 16 camera records per connector, 100 stations
per business. Limits protect an initial pilot; they are not measured capacity
claims. The site machine needs stable power and upload bandwidth. FFmpeg command
lines contain camera/publish credentials on that machine; use a dedicated restricted
service account, restrict process inspection and do not capture full process logs.
The connector emits only fixed status messages, never FFmpeg stderr or URLs.

The connector is a command-line transport, not a customer management application.
For unattended operation, pair interactively first, then configure the OS service
manager to run the same file under the paired user's home directory and restart on
failure. `--pair` explicitly re-enrolls with a new code. This release does not ship
an automatic Windows/macOS installer, auto-updater, local UI or ONVIF discovery.

Cameras limited to a vendor's closed cloud app/serial-number pairing without RTSP
are not connected by entering the model. A vendor API/SDK integration is needed.
H.265 must be switched to H.264 at the source; no transcoding is implemented.

Pilot acceptance must cover the previous customer not seeing a new service,
wrong-site staff isolation, concurrent enrollment/re-pair/revoke, edit while active,
NVR channel selection, credentials with special characters, network loss, key loss,
publisher grant renewal and expiry, iOS/Android playback, and camera audio removal.
Package entitlements, cost/usage metering and retention limits remain commercial
launch work; self-service does not imply unlimited use or vendor certification.

## Profile reference sources

- Hikvision RTSP channel syntax: https://supportusa.hikvision.com/support/solutions/articles/17000129064-how-do-i-get-my-rtsp-stream-
- Dahua Network Video Server manual: https://www.dahuasecurity.com/asset/upload/uploads/soft/20181107/Dahua-Network-Video-Server-Users-Manual-V1.1.1.pdf
- Axis VAPIX streaming: https://developer.axis.com/vapix/network-video/video-streaming/
- Reolink RTSP substream example: https://reolink.com/blog/stream-ip-camera-to-youtube/
- MediaMTX HTTP auth, expireAt and RTMP credentials: https://mediamtx.org/docs/features/authentication
