# scripts

Developer and CI helper scripts (database reset, seed, contract generation, golden dataset runner). Scripts never contain secrets; they read from the environment.

| Folder | What                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| `ci/`  | Security lint, bundle scan, coverage guard, image checks, and tests of the CI config   |
| `db/`  | Migrations, reset and verify, and the chart of accounts validator (see `db/README.md`) |
| `git/` | Commit message check and the staged-secret scan for the pre-commit hook                |
