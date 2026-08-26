#!/usr/bin/env bash
set -euo pipefail

mode="${HEE_BILLING_LAUNCH_MODE:-}"
rehearsal_email="${HEE_BILLING_REHEARSAL_EMAIL:-}"
cli_version="${VERCEL_CLI_VERSION:-59.3.0}"
canonical_host="${PRODUCTION_CANONICAL_HOST:-ir.sa}"
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
    test -n "$rehearsal_email" || { echo "rehearsal mode requires a rehearsal email" >&2; exit 1; }
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

previous_release_json="$(npx --yes "vercel@${cli_version}" curl /api/release --deployment "$previous_url" --token "$VERCEL_TOKEN")"
previous_maintenance_json="$(npx --yes "vercel@${cli_version}" curl /api/maintenance/status --deployment "$previous_url" --token "$VERCEL_TOKEN")"
previous_launch_json="$(npx --yes "vercel@${cli_version}" curl /api/billing/launch-status --deployment "$previous_url" --token "$VERCEL_TOKEN")"
previous_mode="$(node - <<'NODE' "$previous_release_json" "$previous_maintenance_json" "$previous_launch_json" "$mode"
const release = JSON.parse(process.argv[2]);
const maintenance = JSON.parse(process.argv[3]);
const launch = JSON.parse(process.argv[4]);
const targetMode = process.argv[5];
const sha = process.env.GITHUB_SHA;
if (release.releaseSha !== sha || release.environment !== 'production') throw new Error('current canonical rollback baseline is not the exact Production SHA');
if (maintenance.releaseSha !== sha || maintenance.environment !== 'production' || maintenance.maintenance !== false) throw new Error('current canonical rollback baseline is not exact-SHA non-maintenance Production');
if (launch.releaseSha !== sha || launch.environment !== 'production') throw new Error('current canonical billing launch proof does not match the exact Production SHA');
if (launch.billingOperationsReady !== true || launch.renewalEnabled !== true) throw new Error('current canonical billing operations prerequisites are not ready');
const previousMode = String(launch.mode ?? '');
if (targetMode === 'rehearsal' && previousMode !== 'closed') throw new Error(`rehearsal promotion requires a closed baseline, found ${previousMode || 'unknown'}`);
if (targetMode === 'public' && previousMode !== 'rehearsal') throw new Error(`public promotion requires a rehearsal baseline, found ${previousMode || 'unknown'}`);
if (targetMode === 'closed' && !new Set(['public', 'rehearsal', 'closed']).has(previousMode)) throw new Error(`closed promotion baseline is invalid: ${previousMode || 'unknown'}`);
process.stdout.write(previousMode);
NODE
)"
test -n "$previous_mode" || { echo "Could not prove previous billing launch mode" >&2; exit 1; }

rollback_armed=false
rollback_to_previous() {
  echo "Restoring exact-SHA billing launch baseline ${previous_id} (${previous_mode})" >&2
  if ! npx --yes "vercel@${cli_version}" rollback "$previous_url" --yes --timeout 5m --token "$VERCEL_TOKEN"; then
    echo "Rollback command failed for ${previous_id}" >&2
    return 1
  fi
  if ! npx --yes "vercel@${cli_version}" rollback status --timeout 60s --token "$VERCEL_TOKEN"; then
    echo "Rollback status did not complete for ${previous_id}" >&2
    return 1
  fi

  local current_json current_id
  if ! current_json="$(curl --silent --show-error --fail --max-time 20 \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "https://api.vercel.com/v13/deployments/${canonical_host}?teamId=${VERCEL_ORG_ID}")"; then
    echo "Could not resolve canonical deployment identity after rollback" >&2
    return 1
  fi
  current_id="$(node -e 'const b=JSON.parse(process.argv[1]);process.stdout.write(String(b.id??""));' "$current_json")"
  if [ "$current_id" != "$previous_id" ]; then
    echo "Rollback resolved canonical deployment ${current_id:-unknown}, expected ${previous_id}" >&2
    return 1
  fi

  for attempt in $(seq 1 20); do
    local release_json maintenance_json launch_json
    if release_json="$(curl --silent --show-error --fail --max-time 10 "https://${canonical_host}/api/release" 2>/dev/null)" && \
       maintenance_json="$(curl --silent --show-error --fail --max-time 10 "https://${canonical_host}/api/maintenance/status" 2>/dev/null)" && \
       launch_json="$(curl --silent --show-error --fail --max-time 10 "https://${canonical_host}/api/billing/launch-status" 2>/dev/null)" && \
       node - <<'NODE' "$release_json" "$maintenance_json" "$launch_json" "$previous_mode"
const release = JSON.parse(process.argv[2]);
const maintenance = JSON.parse(process.argv[3]);
const launch = JSON.parse(process.argv[4]);
const previousMode = process.argv[5];
const sha = process.env.GITHUB_SHA;
if (release.releaseSha !== sha || release.environment !== 'production') process.exit(1);
if (maintenance.releaseSha !== sha || maintenance.environment !== 'production' || maintenance.maintenance !== false) process.exit(1);
if (launch.releaseSha !== sha || launch.environment !== 'production' || launch.mode !== previousMode) process.exit(1);
if (launch.billingOperationsReady !== true || launch.renewalEnabled !== true) process.exit(1);
NODE
    then
      echo "billing-launch-rollback-proof: PASS deployment=${previous_id} mode=${previous_mode} release=${GITHUB_SHA}" >&2
      return 0
    fi
    sleep 5
  done
  echo "Rollback deployment identity recovered, but canonical billing/runtime state did not converge to ${previous_mode}" >&2
  return 1
}

rollback_if_needed() {
  local code=$?
  trap - EXIT
  if [ "$code" -ne 0 ] && [ "$rollback_armed" = true ]; then
    echo "Billing launch transition failed after promotion became possible; rollback is mandatory" >&2
    if ! rollback_to_previous; then
      echo "CRITICAL: billing launch rollback could not be proven; canonical state requires operator intervention" >&2
      exit 70
    fi
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

# Arm rollback BEFORE the first command that may mutate canonical aliases. Even if
# `vercel promote` mutates Production and then exits non-zero (timeout/network),
# the EXIT trap must restore and prove the previously captured exact-SHA baseline.
rollback_armed=true
npx --yes "vercel@${cli_version}" promote "$deployment_url" --yes --timeout 5m --token "$VERCEL_TOKEN"
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
      rollback_armed=false
      trap - EXIT
      echo "production-billing-launch-mode: PASS previous_mode=${previous_mode} mode=${mode} release=${GITHUB_SHA} deployment=${deployment_url}"
      exit 0
    fi
  fi
  sleep 10
done

echo "Canonical ${canonical_host} did not converge to billing launch mode ${mode} for ${GITHUB_SHA}" >&2
exit 1
