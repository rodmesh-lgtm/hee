#!/usr/bin/env bash
set -euo pipefail

repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
default_sha="${GITHUB_SHA:?GITHUB_SHA is required}"
sha="${RELEASE_QUALITY_SHA:-$default_sha}"
expected_branch="${RELEASE_BRANCH:-hee-v6-rc}"
workflow="${RC_WORKFLOW:-rc-quality.yml}"

valid_sha() { [[ "$1" =~ ^[0-9a-f]{40}$ ]]; }
valid_sha "$sha" || { echo "Invalid release quality SHA"; exit 1; }

green_runs_for_sha() {
  local candidate="$1"
  gh api \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "/repos/${repo}/actions/workflows/${workflow}/runs?head_sha=${candidate}&status=completed&per_page=100" \
    --jq '[.workflow_runs[] | select(.conclusion == "success" and (.event == "push" or .event == "pull_request"))] | length'
}

# Strongest path: the exact release SHA itself has already passed RC Quality.
exact_runs="$(green_runs_for_sha "$sha")"
if [[ "$exact_runs" =~ ^[0-9]+$ ]] && [ "$exact_runs" -ge 1 ]; then
  echo "release-quality-provenance: PASS exact SHA ${sha}"
  exit 0
fi

# GitHub creates a new merge commit SHA even when its tree is byte-for-byte identical
# to the fully tested PR head. In that case, accept only a DIRECT parent whose Git tree
# is exactly the same as the release commit and whose own RC Quality run succeeded.
# This proves the released repository contents (including workflows) are identical to
# tested contents without trusting commit message, branch naming, or a transitive ancestor.
commit_json="$(gh api \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "/repos/${repo}/git/commits/${sha}")"
release_tree="$(node -e 'const x=JSON.parse(process.argv[1]); process.stdout.write(String(x.tree?.sha ?? ""));' "$commit_json")"
mapfile -t parents < <(node -e '
  const x=JSON.parse(process.argv[1]);
  for (const p of Array.isArray(x.parents) ? x.parents : []) console.log(String(p?.sha ?? ""));
' "$commit_json")
valid_sha "$release_tree" || { echo "Release Git tree SHA is invalid"; exit 1; }

# The fallback is intentionally restricted to a real merge commit. A normal one-parent
# commit must pass RC on its own SHA and cannot inherit quality from its parent.
if [ "${#parents[@]}" -lt 2 ]; then
  echo "release-quality-provenance: FAIL exact SHA ${sha} has no green RC run and is not a merge commit"
  exit 1
fi

for parent in "${parents[@]}"; do
  valid_sha "$parent" || continue
  parent_tree="$(gh api \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "/repos/${repo}/git/commits/${parent}" \
    --jq '.tree.sha')"
  [ "$parent_tree" = "$release_tree" ] || continue

  parent_runs="$(green_runs_for_sha "$parent")"
  if [[ "$parent_runs" =~ ^[0-9]+$ ]] && [ "$parent_runs" -ge 1 ]; then
    echo "release-quality-provenance: PASS merge ${sha} has tree-identical directly tested parent ${parent}"
    exit 0
  fi
done

echo "release-quality-provenance: FAIL no exact-SHA or tree-identical direct-parent RC Quality proof for ${sha} on ${expected_branch}"
exit 1
