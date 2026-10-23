# INFRO Live — bring-up and actual pilot

## Current release boundary

The dashboard and self-service camera linking are enabled in Production as of
2026-10-23. The direct relay is provisioned at `live.ir.sa`; HTTPS and RTMPS use a
trusted Let's Encrypt certificate. Docker services `media` and `guard` are running.
Anonymous health/media requests are denied, the platform reader callback succeeds,
and invalid relay/publisher credentials are denied. The twice-daily
`infro-live-renew.timer` is enabled; both renewal dry-run and its oneshot service
passed. `renew-direct.sh` uses noninteractive Docker execution.

Production migration workflow 39962395723 verified a clean, checksum-matched
106-migration release with no pending migrations. The activated dashboard queries
its live tables successfully. Platform secrets are stored as sensitive Production
variables; never include their values in this document or logs. The temporary
Vercel administration sandbox must be stopped and its operator key removed after
bring-up. The Linux host's operational configuration is under `/opt/infro-live`.

No physical customer camera has been tested. Infrastructure checks do not prove
camera compatibility, Windows startup, playback, grant rotation, or revocation on
an actual viewing device. Complete the acceptance section below before calling
the customer's camera service fully operational.

The customer confirmed a Windows machine is available at the workshop. Camera/NVR
brand, model and RTSP availability are not yet known. Never request passwords in
chat: the owner enters camera credentials in their INFRO account after activation.

## Platform bring-up — INFRO operator

1. Provide an always-on Linux relay host with Docker Compose, a reachable TCP 1936
   port, publicly trusted renewable RTMPS certificate, and guarded HTTPS HLS origin.
   The existing central relay recipe is in SELF-SERVICE.md. Ordinary request-bound
   web Functions do not replace a persistent RTMPS ingestion process.
2. Install the direct VPS recipe below, or the existing `compose-relay.yml` tunnel
   recipe. Do not run both. Use the fixed trusted INFRO origin
   for relay auth. Keep internal media/auth/API ports private. Certificate and
   tunnel provisioning are required; do not use a self-signed certificate or
   expose raw HLS as a shortcut.
3. Generate the three independent platform keys specified in SELF-SERVICE.md.
   Keep the credential encryption key durable and backed up. Set the matching
   guard/auth secrets at the relay and web deployment. Do not commit keys.
4. Run the existing Production Preflight, backup, maintenance and migration
   workflows for the exact intended release; apply committed migrations with
   Prisma migrate deploy. Do not apply just a subset through db push or claim a
   configured schema because the models exist in the repository. Other feature
   migrations may also be pending and must pass the release's established checks.
5. In an operator environment with the intended production connection and live
   settings, run `node scripts/live-view-preflight.mjs --database --relay`.
   This command only reads schema/migration metadata, checks guard authorization
   and verifies public RTMPS TLS. It does not print credentials or change data.
   The authorized `/_infro/health` confirms the guard only; a real camera is still
   required to validate media ingestion. Anonymous health requests must be 403.
6. Publish the enabled web release only after schema and relay checks pass.

## Direct VPS recipe — no Cloudflare dependency

This is an operator recipe, not a claim that a host exists. Use a dedicated Linux
host with Docker Compose, correctly resolved public DNS and TCP 80, 443, 1936.
Do not publish media:8888 or guard:8081. Point a relay hostname under ir.sa directly
at its public address, without an HTTP-only proxy in front of RTMPS.

In `ops/live-view`, create a protected `.env` (mode 0600) with
LIVE_VIEW_GATEWAY_HOST (hostname only), LIVE_VIEW_GATEWAY_SECRET and
LIVE_VIEW_RELAY_AUTH_SECRET. Generate separate random 32+ character secrets and
store their web equivalents privately. Do not put the credential encryption key
on the relay. The same public hostname serves guarded HLS over 443 and RTMPS over
1936. Both use the public certificate below.

The operator must have accepted the ACME subscriber agreement and supply their
certificate renewal email when issuing the first certificate. From a protected
shell with RELAY_HOST and OPERATOR_EMAIL set (no camera credentials involved):

```sh
mkdir -p letsencrypt acme-webroot
chmod 700 letsencrypt
docker compose -f compose-direct.yml --profile tools run --rm -p 80:80 certbot certonly --standalone --non-interactive --agree-tos --email "$OPERATOR_EMAIL" --cert-name "$RELAY_HOST" -d "$RELAY_HOST"
docker compose -f compose-direct.yml config --quiet
docker compose -f compose-direct.yml up -d media guard
```

Set web origins to `https://<relay-host>` and `rtmps://<relay-host>:1936`.
Install a root-owned scheduler to run `bash /absolute/relay/path/renew-direct.sh`
every 12 hours, alert on failure, and verify certificate expiry externally.
Renewal uses the HTTP challenge path only; it never opens HLS over plaintext HTTP.
When the certificate changes, both TLS readers restart; a short reconnect is
expected. Keep certificate directories and platform secrets out of Git/backups
that are not authorized to hold keys. The direct Compose stack requires Docker,
ACME and real-host smoke validation before activation.

## Workshop Windows setup

Use a dedicated Windows user and keep the machine awake, on stable power/network.
Node 20+ and FFmpeg/FFprobe must already be installed from official sources and
available in the terminal. FFmpeg and FFprobe must be in the same directory. The
helper does not install dependencies or change global PowerShell execution policy.

Download `/connectors/infro-live-windows.mjs` from the customer's INFRO setup page.
Open a terminal in its download directory and run:

```text
node infro-live-windows.mjs --check
```

After platform activation, the owner adds the site and receives its one-use code.
From the same Windows user, run:

```text
node infro-live-windows.mjs --install
```

The helper downloads a pinned connector from https://ir.sa, pairs interactively
and registers `INFRO Live Connector`. No camera credentials or Windows password
are put in the task XML. The directory is restricted to that user and SYSTEM.
The scheduled command pins Node and FFmpeg directories instead of relying on a
future Task Scheduler PATH. The token and source remain in `~/.infro-live`.

This pilot starts after **that user logs in**, not before login. A locked desktop
can stay signed in; signing out, sleep or shutdown interrupts viewing. Restarting
Windows requires signing back in. The helper requests task startup; INFRO's actual
site heartbeat and camera stream checks determine connection status. Linux tests
do not prove Task Scheduler registration or FFmpeg TLS trust on Windows. Test both
on the customer's machine. Automatic updates and unattended boot service are not
part of this helper.

For a deliberate reinstall, first revoke the site from INFRO (closes customer
access), stop/end the task in Windows Task Scheduler, confirm no connector-owned
FFmpeg process remains, and delete that task. Download the current helper and
generate a fresh site pairing code. Do not delete the Windows token folder while
its publisher is still running.

## Real acceptance — one camera, one service station

- From INFRO, enter the actual LAN address, camera/NVR model, channel and a
  dedicated viewing account. Enable RTSP/H.264 at the device if supported.
- Confirm actual source probe and relay playback; the account must show the site
  connected and the station's video ready before creating a link.
- Create a customer session and open the link on a separate phone over mobile
  data. Verify the assigned station only, no audio, and iOS/Android playback.
- End the session in INFRO. Confirm new playlist and segment requests are denied
  on the already-open device, not merely that reopening the page fails. Already
  received buffers cannot be recalled.
- Repeat with a replaced link and with TTL expiration. Old tokens must fail.
- Disconnect/revoke the connector, remove network and restore it; viewing must
  fail closed and recover only after fresh successful checks.
- Test publisher grant rotation over at least ten minutes, then Windows restart
  followed by sign-in. Record gaps and startup recovery rather than claiming
  gap-free streaming.
- Verify a second business cannot read this business's cameras or sessions.

Only after these real steps pass should the customer's camera service be called
fully operational. Record the device/firmware, browser and measured bandwidth;
do not generalize one camera test to all models or all concurrent loads.
