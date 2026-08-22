#!/usr/bin/env bash
set -euo pipefail

mode="${HEE_BILLING_LAUNCH_MODE:-}"
rehearsal_email="${HEE_BILLING_REHEARSAL_EMAIL:-}"
cli_version="${VERCEL_CLI_VERSION:-59.3.0}"
canonical_host="${PRODUCTION_CANONICAL_HOST:-hee.sa}"
previous_file="${HEE_PREVIOUS_DEPLOYMENT_FILE:-/tmp/hee-billing-launch-previous.json}"
staged_file="${HEE_STAGED_DEPLOYMENT_FILE:-/tmp/hee-billing-launch-staged-url}"

required() {
  local name="$1"
  test -n "${!name:-}" || { echo "${name} is required" >&2; exit 1; }
}
required VERCEL_TOKEN
required VERCEL_ORG_ID
required VERCEL_PROJECT_ID
required GITHUB_SHA

case "$mode" in
  closed)
    public_enabled=false
    test -z "$rehearsal_email" || { echo "closed mode cannot carry a rehearsal email" >&2; exit 1; }
    ;;
  rehearsal)
    public_enabled=false
    [[ "$rehearsal_email" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || { echo "rehearsal mode requires a valid rehearsal email" >&2; exit 1; }
    ;;
  public)
    public_enabled=true
    test -z "$rehearsal_email" || { echo "public mode cannot carry a rehearsal email" >&2; exit 1; }
    ;;
  *) echo "HEE_BILLING_LAUNCH_MODE must be closed, rehearsal, or public" >&2; exit 1 ;;
esac

repo_root="$(git rev-parse --show-toplevel)"
node "$repo_root/.github/scripts/capture-current-vercel-production.mjs" "$previous_file"
previous_id="$(node -e 'const r=require(process.argv[1]);process.stdout.write(String(r.id??""));' "$previous_file")"
previous_url="$(node -e 'const r=require(process.argv[1]);process.stdout.write(String(r.url??""));' "$previous_file")"
test -n "$previous_id" && test -n "$previous_url" || { echo "Could not capture current canonical deployment" >&2; exit 1; }

promoted=false
rollback_if_needed() {
  local code=$?
  if [ "$code" -ne 0 ] && [ "$promoted" = true ]; then
    echo "Billing launch promotion failed after canonical mutation; rolling back to ${previous_id}" >&2
    npx --yes "vercel@${cli_version}" rollback "$previous_url" --yes --timeout 5m --token "$VERCEL_TOKEN" || true
    npx --yes "vercel@${cli_version}" rollback status --timeout 60s --token "$VERCEL_TOKEN" || true
  fi
  exit "$code"
}
trap rollback_if_needed EXIT

deployment_url="$(npx --yes "vercel@${cli_version}" deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" \
  --env RELEASE_SHA="$GITHUB_SHA" --build-env RELEASE_SHA="$GITHUB_SHA" \
  --env PAID_CHECKOUT_PUBLIC_ENABLED="$public_enabled" --build-env PAID_CHECKOUT_PUBLIC_ENABLED="$public_enabled" \
  --env BILLING_REHEARSAL_USER_EMAIL="$rehearsal_email" --build-env BILLING_REHEARSAL_USER_EMAIL="$rehearsal_email")"
test -n "$deployment_url" || { echo "Vercel did not return a staged deployment URL" >&2; exit 1; }
printf '%s' "$deployment_url" > "$staged_file"

release_json="$(npx --yes "vercel@${cli_version}" curl /api/release --deployment "$deployment_url" --token "$VERCEL_TOKEN")"
maintenance_json="$(npx --yes "vercel@${cli_version}" curl /api/maintenance/status --deployment "$deployment_url" --token "$VERCEL_TOKEN")"
launch_json="$(npx --yes "vercel@${cli_version}" curl /api/billing/launch-status --deployment "$deployment_url" --token "$VERCEL_TOKEN")"
node - <<'NODE' "$release_json" "$maintenance_json" "$launch_json" "$mode"
const release = JSON.parse(process.argv[2]);
const maintenance = JSON.parse(process.argv[3]);
const launch = JSON.parse(process.argv[4]);
const mode = process.argv[5];
const sha = process.env.GITHUB_SHA;
if (release.releaseSha !== sha || release.environment !== 'production') throw new Error('staged release provenance mismatch');
if (maintenance.releaseSha !== sha || maintenance.environment !== 'production' || maintenance.maintenance !== false) throw new Error('staged deployment is not exact-SHA non-maintenance Production');
if (launch.releaseSha !== sha || launch.environment !== 'production' || launch.mode !== mode) throw new Error('staged billing launch mode mismatch');
if (launch.billingOperationsReady !== true || launch.renewalEnabled !== true) throw new Error('staged billing operations prerequisites are not ready');
NODE

npx --yes "vercel@${cli_version}" promote "$deployment_url" --yes --timeout 5m --token "$VERCEL_TOKEN"
promoted=true
npx --yes "vercel@${cli_version}" promote status --timeout 60s --token "$VERCEL_TOKEN"

for attempt in $(seq 1 30); do
  if release_json="$(curl --silent --show-error --fail --max-time 10 "https://${canonical_host}/api/release" 2>/dev/null)" && \
     maintenance_json="$(curl --silent --show-error --fail --max-time 10 "https://${canonical_host}/api/maintenance/status" 2>/dev/null)" && \
     launch_json="$(curl --silent --show-error --fail --max-time 10 "https://${canonical_host}/api/billing/launch-status" 2>/dev/null)"; then
    if node - <<'NODE' "$release_json" "$maintenance_json" "$launch_json" "$mode"
const release = JSON.parse(process.argv[2]);
const maintenance = JSON.parse(process.argv[3]);
const launch = JSON.parse(process.argv[4]);
const mode = process.argv[5];
const sha = process.env.GITHUB_SHA;
if (release.releaseSha !== sha || release.environment !== 'production') process.exit(1);
if (maintenance.releaseSha !== sha || maintenance.environment !== 'production' || maintenance.maintenance !== false) process.exit(1);
if (launch.releaseSha !== sha || launch.environment !== 'production' || launch.mode !== mode) process.exit(1);
if (launch.billingOperationsReady !== true || launch.renewalEnabled !== true) process.exit(1);
NODE
    then
      promoted=false
      trap - EXIT
      echo "production-billing-launch-mode: PASS mode=${mode} release=${GITHUB_SHA} deployment=${deployment_url}"
      exit 0
    fi
  fi
  sleep 10
done

echo "Canonical ${canonical_host} did not converge to billing launch mode ${mode} for ${GITHUB_SHA}" >&2
exit 1
