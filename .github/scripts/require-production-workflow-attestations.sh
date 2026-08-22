#!/usr/bin/env bash
set -euo pipefail

workflow_ref="${GITHUB_WORKFLOW_REF:-}"
repo_root="$(git rev-parse --show-toplevel)"
helper="$repo_root/.github/scripts/require-production-preflight-attestation.sh"

verify_scope() {
  scope="$1"
  bash "$helper" "$scope"
}

case "$workflow_ref" in
  */.github/workflows/production-enter-maintenance.yml@*)
    verify_scope release-core
    verify_scope worker-host
    ;;
  */.github/workflows/production-migrations.yml@*)
    verify_scope migration-core
    verify_scope worker-host
    ;;
  */.github/workflows/production-deploy.yml@*)
    verify_scope release-core
    ;;
  */.github/workflows/production-worker-deploy.yml@*)
    verify_scope worker-host
    ;;
  */.github/workflows/production-preflight.yml@*|*/.github/workflows/production-launch-readiness.yml@*|*/.github/workflows/production-backup-proof.yml@*)
    echo "production-workflow-attestation: intentionally not required for ${workflow_ref}"
    ;;
  "")
    echo "GITHUB_WORKFLOW_REF is required" >&2
    exit 1
    ;;
  */.github/workflows/production-*.yml@*)
    echo "Unknown Production workflow has no explicit attestation policy: ${workflow_ref}" >&2
    exit 1
    ;;
  *)
    echo "production-workflow-attestation: non-Production workflow; release provenance only"
    ;;
esac
