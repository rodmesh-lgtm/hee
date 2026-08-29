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
  "/repos/${GITHUB_REPOSITORY}/actions/workflows/production-preflight-v2.yml/runs?head_sha=${GITHUB_SHA}&status=completed&per_page=20" \
  --jq '[.workflow_runs[] | select(.conclusion == "success" and .event == "workflow_dispatch" and .head_branch == "hee-v6-rc")] | sort_by(.run_number) | last | .id // empty')"

test -n "$run_id" || { echo "Exact SHA has no successful Production Preflight V2 run" >&2; exit 1; }

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

artifact_id="$(ARTIFACT_NAME="$artifact_name" gh api \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "/repos/${GITHUB_REPOSITORY}/actions/runs/${run_id}/artifacts?per_page=100" \
  --jq '[.artifacts[] | select(.name == env.ARTIFACT_NAME and .expired == false)] | sort_by(.created_at) | last | .id // empty')"

test -n "$artifact_id" || { echo "Successful Production Preflight V2 run ${run_id} has no usable ${artifact_name} artifact" >&2; exit 1; }

archive="$tmpdir/production-preflight-attestation.zip"
curl --silent --show-error --fail --location \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/artifacts/${artifact_id}/zip" \
  --output "$archive"
unzip -q "$archive" -d "$tmpdir"

attestation="$tmpdir/production-preflight-attestation.json"
test -s "$attestation" || { echo "Downloaded Production Preflight V2 attestation is missing or empty" >&2; exit 1; }

node "$repo_root/.github/scripts/production-config-attestation.mjs" verify "$scope" "$attestation"
