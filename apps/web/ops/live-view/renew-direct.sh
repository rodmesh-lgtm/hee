#!/usr/bin/env bash
# Invoke every 12 hours as the relay operator from this directory.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
before="$(find letsencrypt/live -type l -name fullchain.pem -exec sha256sum {} \; | sort)"
docker compose -f compose-direct.yml --profile tools run --rm -T --interactive=false certbot renew --webroot -w /var/www/acme --quiet
after="$(find letsencrypt/live -type l -name fullchain.pem -exec sha256sum {} \; | sort)"
if [[ "$before" != "$after" ]]; then
  docker compose -f compose-direct.yml restart guard media
fi
