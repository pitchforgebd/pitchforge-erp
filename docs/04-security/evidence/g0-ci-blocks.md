# G0 evidence: secret scan, dependency audit and branch protection

Gate G0 requires proof that CI blocks a planted secret and a vulnerable package, and that `main` cannot be pushed to directly ([security gates](../security-gates.md), Phase 0 row).

| #   | Check                                                                                            | Where                                               | Result                                                    | Date        |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------- | ----------- |
| 1   | Pre-commit hook blocks a staged secret                                                           | Local (Windows 11, gitleaks 8.30.1, lefthook 2.2.2) | **Pass**: hook exited 1, "leaks found: 1"                 | 04 Nov 2026 |
| 2   | gitleaks config catches planted secrets and ignores placeholders                                 | Local                                               | **Pass**: see below                                       | 04 Nov 2026 |
| 3   | Working tree has no findings                                                                     | Local, `gitleaks dir .`                             | **Pass**: "no leaks found"                                | 04 Nov 2026 |
| 4   | CI `security` job fails on a planted secret (`chore/ci-proof-secret`, pushed with `--no-verify`) | GitHub Actions                                      | Pending: needs the remote repository                      | —           |
| 5   | CI `security` job fails on a vulnerable dependency (`chore/ci-proof-vuln`)                       | GitHub Actions                                      | Pending: needs the remote repository                      | —           |
| 6   | Proof PRs cannot be merged (red required checks)                                                 | GitHub                                              | Pending                                                   | —           |
| 7   | Direct push to `main` rejected; ruleset exported                                                 | GitHub                                              | Pending: see [branch protection](../branch-protection.md) | —           |
| 8   | GitHub push protection rejects the planted token (if Secret Protection is enabled)               | GitHub                                              | Pending                                                   | —           |

## 1. Pre-commit hook

A file containing a random `pf_test_canary_…` value (the custom canary rule in `.gitleaks.toml`) was staged and the hook was run with `pnpm exec lefthook run pre-commit --job gitleaks`:

```text
🥊 lefthook v2.2.2  hook: pre-commit
INF 0 commits scanned.
INF scanned ~73 bytes (73 bytes)
WRN leaks found: 1
┃  gitleaks ❯
exit status 1
```

The file was then unstaged and deleted. If gitleaks is not installed, the hook fails closed (`scripts/git/run-gitleaks-staged.mjs`).

## 2. Positive and negative controls

Files generated with random values in a scratch directory, scanned with the repository config:

| File content                                         | Expected   | Result                             |
| ---------------------------------------------------- | ---------- | ---------------------------------- |
| `pf_test_canary_` + 32 random characters             | Caught     | `pitchforge-canary`                |
| `SESSION_SECRET=` + 24 random bytes                  | Caught     | `pitchforge-env-secret`            |
| `postgresql://app:<random>@db.internal:5432/erp`     | Caught     | `pitchforge-postgres-url-password` |
| `SESSION_SECRET=` (empty), `S3_SECRET_KEY=change-me` | Not caught | Not caught                         |

Writing this check turned up and fixed two config bugs: an empty `SESSION_SECRET=` line captured the next line as its value, and the image name `valkey/valkey:9.0.7` matched gitleaks' generic API-key rule.

## 4–8. Remote checks

To do once the repository exists (Phase 0 plan, Q2). Paste the run URLs and screenshots here. Close the proof PRs without merging and delete their branches.

## Still to collect

These need the GitHub repository or AWS, so they are not done yet:

- Rows 4 to 8 above.
- The exported ruleset from GitHub, once it is applied.
- The header scan report for staging (grade A), once staging exists.
