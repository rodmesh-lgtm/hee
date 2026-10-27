#!/usr/bin/env bash
# Operator-side image preparation only. Not a customer copy/paste installer.
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run from an authorized root operator session.' >&2; exit 1; }
node_major=$(/usr/bin/node -p 'Number(process.versions.node.split(".")[0])')
[[ $node_major -ge 20 ]] || { echo 'Provision a supported Node 20+ runtime first.' >&2; exit 1; }
/usr/bin/ffmpeg -version >/dev/null
/usr/bin/ffprobe -version >/dev/null
image_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)
if ! id infro-live >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/infro-live --shell /usr/sbin/nologin infro-live
fi
install -d -o root -g root -m 0755 /opt/infro-live
install -d -o infro-live -g infro-live -m 0700 /var/lib/infro-live
install -o root -g root -m 0644 "$image_root/apps/web/public/connectors/infro-live-connector.mjs" /opt/infro-live/infro-live-connector.mjs
install -o root -g root -m 0644 "$image_root/ops/live-view/appliance/infro-live.service" /etc/systemd/system/infro-live.service
systemctl daemon-reload
printf '%s\n' 'Image prepared. Pair each physical device locally with its own branch code:'
printf '%s\n' 'sudo -u infro-live /usr/bin/node /opt/infro-live/infro-live-connector.mjs --pair-only --state-directory /var/lib/infro-live'
printf '%s\n' 'Then: systemctl enable --now infro-live.service'
