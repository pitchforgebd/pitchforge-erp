# Branch protection and repository settings

**`main` accepts changes only through a squash-merged pull request with two approvals (one from a code owner), signed commits and four green checks. Nobody can bypass this, including admins.** The rules are kept as code in [`.github/rulesets/main.json`](../../.github/rulesets/main.json). A test (`scripts/ci/ruleset.test.ts`) fails if the required checks drift from the CI job names.

- **Status:** Ready to apply. Needs the GitHub organisation, teams and plan (Phase 0 plan, Q2).
- **Owner:** Security owner + tech lead

## The `main` ruleset

| Rule                        | Setting                                                                                                   | Why                                                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull request required       | 2 approvals, code-owner review, approval after the last push, stale approvals dismissed, threads resolved | No direct pushes. GitHub's code-owner review accepts **one** owner even when a line lists two teams, so the "two reviewers for money, payroll, partners, auth and infra" rule is met by requiring 2 approvals everywhere. |
| Required checks             | `quality`, `contracts`, `security`, `database`, `build`, run against the latest `main`                    | CI gates every merge                                                                                                                                                                                                      |
| Signed commits              | Required                                                                                                  | Commits are attributable                                                                                                                                                                                                  |
| Linear history, squash only | Required                                                                                                  | One reviewed commit per change                                                                                                                                                                                            |
| Force-push and deletion     | Blocked                                                                                                   | History cannot be rewritten                                                                                                                                                                                               |
| Bypass list                 | Empty                                                                                                     | Admins follow the same rules                                                                                                                                                                                              |

## Prerequisites (Q2)

1. The `pitchforge` organisation, with teams `engineering`, `tech-lead`, `backend`, `finance-reviewer` and `security`, each holding at least one member who is not the PR author.
2. **GitHub Team plan or higher**: rulesets on private repositories need it.
3. **GitHub Secret Protection** for secret scanning and push protection on a private repository. Without it, gitleaks (pre-commit and CI) is the only secret scan; record that decision here.
4. Every developer has commit signing set up (SSH signing is simplest: `git config --global gpg.format ssh`, `user.signingkey`, `commit.gpgsign true`) and the key added to GitHub as a **signing** key.

## Apply

Run by a repository admin. Each command changes the remote.

```bash
gh repo create pitchforge/pitchforge-erp --private --source . --remote origin
git push -u origin main

# Ruleset
gh api -X POST repos/pitchforge/pitchforge-erp/rulesets --input .github/rulesets/main.json

# Merge settings: squash only, delete branches after merge
gh api -X PATCH repos/pitchforge/pitchforge-erp \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true -F allow_auto_merge=false

# Actions: read-only token by default; Actions cannot approve PRs
gh api -X PUT repos/pitchforge/pitchforge-erp/actions/permissions/workflow \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false

# Security features (secret scanning needs Secret Protection on private repos)
gh api -X PATCH repos/pitchforge/pitchforge-erp --input - <<'EOF'
{ "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" } } }
EOF
gh api -X PUT repos/pitchforge/pitchforge-erp/vulnerability-alerts
gh api -X PUT repos/pitchforge/pitchforge-erp/private-vulnerability-reporting
```

Then install the Renovate GitHub App on the repository. It reads [`renovate.json`](../../renovate.json).

## Verify (G0 evidence)

Record the results in [evidence/g0-ci-blocks.md](evidence/g0-ci-blocks.md).

1. `git push origin main` with a trivial change, from an admin account → **rejected**.
2. A PR with an unsigned commit → merge blocked.
3. A PR with one approval → merge blocked; with two approvals but none from a code owner on `/packages/shared-kernel/` → blocked.
4. A PR with a failing check → merge blocked.
5. Export the live ruleset and commit it next to the evidence:
   `gh api repos/pitchforge/pitchforge-erp/rulesets --jq '.[0].id' | xargs -I{} gh api repos/pitchforge/pitchforge-erp/rulesets/{} > docs/04-security/evidence/ruleset-main.json`
