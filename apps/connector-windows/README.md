# INFRO Windows Connector — internal pilot 0.2

Windows Forms setup application and a real Windows Service. Replaces terminal
pairing for new installs. **Not yet a signed customer release.**

## Customer flow

1. Run installer (Windows 10 1809+/11, x64, administrator approval).
2. Click تجهيز أدوات البث تلقائيًا. Visible Microsoft WinGet windows install
   machine-wide `OpenJS.NodeJS.LTS` and `Gyan.FFmpeg`. Customer reviews any source
   and package agreements. No automatic agreement acceptance. Node, FFmpeg and
   FFprobe are NOT redistributed. First setup needs internet and App Installer.
3. Open account from app, add branch, paste single-use 10-minute code. No camera
   passwords in the app. They remain in the platform's camera configuration form.
4. Service starts under `NT AUTHORITY\LocalService`, delayed automatic startup,
   recovery restarts. State ACLs allow only Administrators, SYSTEM and LocalService
   under `%ProgramData%\INFRO\Live\State`. Runtime is machine-wide Program Files.
5. Optional ONVIF button discovers private IPv4 endpoints with bounded XML parsing;
   no device HTTP/login calls. Copy selected address into the account camera form.
   Devices with discovery off can be added manually. Discovery does not certify
   model compatibility or video availability.
6. Status shows connector connection separately from actual video. Keep machine
   awake. No automatic power/firewall/router changes. Legacy pairing is not moved.

If WinGet is missing, use Microsoft's official App Installer or support-assisted
machine-wide dependency installation. Do not bypass SmartScreen/TLS warnings.

## Build and release

`powershell -File apps/connector-windows/build.ps1`: compile with Windows' .NET
Framework compiler, run native private-host/XML checks, package with Inno Setup 6.
CI uploads short-lived INTERNAL artifact only. No automatic customer release.

Production requires operator-managed `infro-sign.cmd` certificate/HSM integration,
then `build.ps1 -Signed`. App, installer and uninstaller are signed; Authenticode
is verified for app and installer. No self-signed certificate/private key is
created here. **Signing is not provisioned.** Updates use manually installed
signed upgrades, no self-update execution channel. A verified signed installer
may be deployed to static public downloads after real acceptance below.

## Required real-machine acceptance

- Clean Windows install -> dependencies -> pair -> LocalService identity confirmed.
- FFmpeg/FFprobe work under service identity; RTMPS TLS stays verified.
- Unprivileged user cannot read/replace token/runtime/service configuration.
- Real Hikvision H.264 source -> account readiness -> external customer playback.
- Internet loss stops upload; reconnect restores real image.
- Stop/crash kills Node AND FFmpeg; recovery does not duplicate streams.
- Reboot with no user login -> real playback resumes.
- ONVIF across LAN adapters, malformed/oversized responses and no responders.
- Revoke branch in INFRO -> upload and customer access stop.
- Upgrade stops old service before file replacement. Uninstall removes service but
  retains protected pairing state for deliberate reinstall. Revoke before disposal.
- Legacy migration: support revokes old site, stops/deletes old task, securely
  removes old local token, then owner pairs new service. Never run both.

Compilation and Linux tests do not prove these Windows hardware behaviors.

Build evidence (2026-10-27): Windows workflow 40476032012 passed compilation,
ONVIF XML/private-host checks, silent installer execution, real SCM startup under
LocalService (with a local smoke worker), job shutdown and uninstall. This worker
uses no camera, production credential or remote API. Actual Node/FFmpeg RTMPS,
cold boot and customer playback remain pending, as does signing.

The platform dependency audit also identified GHSA-mrhx-c7xc-m3w5 in existing Zod
versions. The associated change pins patched 4.6.6 and overrides transitive copies;
it does not downgrade @vercel/functions or disable the audit gate.
