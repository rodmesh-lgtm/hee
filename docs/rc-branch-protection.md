# HEE RC branch protection

`hee-v6-rc` is the release-candidate integration branch. It must not be treated as production-ready while repository branch protection is disabled.

## Required repository settings

Configure a GitHub ruleset or branch protection rule for `hee-v6-rc` with these minimum controls:

- Require a pull request before merging.
- Require the `RC Quality / unit-tests` status check to pass before merging.
- Require branches to be up to date before merging when GitHub can enforce it without creating a merge loop.
- Block force pushes.
- Block branch deletion.
- Require conversation resolution before merging.
- Do not allow bypass for routine changes. Emergency bypass, if retained for the repository owner, must be exceptional and followed by a full RC Quality run.

## Release invariant

A release candidate is acceptable only when all of the following refer to the same intended code state:

1. the reviewed PR head passed RC Quality;
2. the merge commit on `hee-v6-rc` passed the push-triggered RC Quality workflow;
3. the matching Vercel Preview is READY and basic runtime/security-header checks pass;
4. no production migration is run automatically from an unreviewed push.

The workflow intentionally runs on pushes to `hee-v6-rc` that change `apps/web/**` or `.github/workflows/**`. Repository protection is still required because CI configuration alone does not prevent a direct push or a merge performed before checks finish.

## Production boundary

`production-migrations.yml` is a separately authorized production operation. Passing RC Quality never grants permission to run production migrations, inject live payment secrets, or promote a deployment to production. Those remain explicit release actions after external Moyasar and VAT/ZATCA launch gates are satisfied.
