#!/usr/bin/env bash
set -euo pipefail

workflow="${GITHUB_WORKFLOW:-}"
repo_root="$(git rev-parse --show-toplevel)"
helper="$repo_root/.github/scripts/require-production-preflight-attestation.sh"

verify_scope() {
  scope="$1"
  bash "$helper" "$scope"
}

case "$workflow" in
  "Production Enter Maintenance")
    verify_scope release-core
    verify_scope worker-host
    ;;
  "Production Database Migrations")
    verify_scope migration-core
    verify_scope worker-host
    ;;
  "Production Web Deploy")
    verify_scope release-core
    ;;
  "Production Billing Worker Deploy")
    verify_scope worker-host
    ;;
  "Production Preflight"|"Production Launch Readiness"|"Production Backup Proof"|"RC Quality")
    echo "production-workflow-attestation: not required for ${workflow}"
    ;;
  "")
    echo "GITHUB_WORKFLOW is required" >&2
    exit 1
    ;;
  *)
    echo "production-workflow-attestation: no Production attestation mapping for ${workflow}; release provenance only"
    ;;
esac
