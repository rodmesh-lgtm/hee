#!/usr/bin/env bash
set -euo pipefail

scope="${1:-}"
case "$scope" in
  release-core|migration-core|worker-host) ;;
  *) echo "Usage: require-production-preflight-attestation.sh <release-core|migration-core|worker-host>" >&2; exit 2 ;;
esac

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

repo_root="$(git rev-parse --show-toplevel)"
artifact_name="production-preflight-attestation-${GITHUB_SHA}"

run_id="$(gh api \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "/repos/${GITHUB_REPOSITORY}/actions/workflows/production-preflight.yml/runs?head_sha=${GITHUB_SHA}&status=completed&per_page=20" \
  --jq '[.workflow_runs[] | select(.conclusion == "success" and .event == "workflow_dispatch" and .head_branch == "hee-v6-rc")] | sort_by(.run_number) | last | .id // empty')"

test -n "$run_id" || { echo "Exact SHA has no successful Production Preflight run" >&2; exit 1; }

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

if ! gh run download "$run_id" --repo "$GITHUB_REPOSITORY" --name "$artifact_name" --dir "$tmpdir"; then
  echo "Successful Production Preflight run ${run_id} has no usable ${artifact_name} artifact" >&2
  exit 1
fi

attestation="$tmpdir/production-preflight-attestation.json"
test -s "$attestation" || { echo "Downloaded Production Preflight attestation is missing or empty" >&2; exit 1; }

node "$repo_root/.github/scripts/production-config-attestation.mjs" verify "$scope" "$attestation"
