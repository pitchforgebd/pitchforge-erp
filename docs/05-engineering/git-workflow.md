# Git workflow

**Trunk-based development: short-lived branches off `main`, squash-merged after review and green CI.**

| Item           | Rule                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Default branch | `main`, protected, always deployable to staging                                                                                              |
| Branch names   | `feat/<FEATURE-ID>-short`, `fix/…`, `chore/…`, `docs/…`, `contract/…`                                                                        |
| Branch life    | Under 3 days; split larger work behind feature flags                                                                                         |
| Commits        | Conventional Commits, signed: `feat(billing): record AIT on receipts`                                                                        |
| Pull requests  | Template filled; linked feature ID; screenshots with sample data only                                                                        |
| Reviews        | Two approvals on every PR, including a code owner (GitHub cannot require two only for some paths; see docs/04-security/branch-protection.md) |
| Merge          | Squash; delete branch                                                                                                                        |
| Releases       | Tag `vMAJOR.MINOR.PATCH` on `main`; changelog updated; production deploy needs manual approval                                               |
| Hotfix         | Branch from the release tag, fix, tag patch, merge back to `main`                                                                            |
| Contracts      | Contract changes in their own `contract/…` PR before UI or API changes                                                                       |
