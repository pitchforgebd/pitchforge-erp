# Contributing

## Before you write code

1. Read the [architecture overview](docs/02-architecture/architecture-overview.md) and the [coding standards](docs/05-engineering/coding-standards.md).
2. Find the task on the board; it must reference a feature ID from the [feature list](docs/01-requirements/feature-list.md).
3. If the change touches an API, change `packages/contracts` **first** in its own pull request.

## Set up your machine

1. Node (any recent version) and pnpm 12: `npm install -g pnpm@12.16.1`. pnpm downloads the project's Node (26.13.0) itself.
2. gitleaks 8.30.1: `winget install Gitleaks.Gitleaks` (Windows) or `brew install gitleaks` (macOS). The pre-commit hook refuses to commit without it.
3. Commit signing (required on `main`): `git config --global gpg.format ssh`, `git config --global user.signingkey <path-to-public-key>`, `git config --global commit.gpgsign true`, then add the key to GitHub as a signing key.
4. `pnpm install` (also installs the git hooks), then `pnpm lint && pnpm typecheck && pnpm test`.

Commands: see [CLAUDE.md](CLAUDE.md#commands).

## Workflow

- Branch from `main`: `feat/FIN-12-payment-run`, `fix/AUTH-04-reset-expiry`, `docs/…`, `chore/…`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat(accounting): post payment runs with withholding`.
- Open a pull request using the template. CI must be green; two approvals are required, including a code owner ([branch protection](docs/04-security/branch-protection.md)).
- Squash-merge. Delete the branch.

Details: [Git workflow](docs/05-engineering/git-workflow.md).

## Definition of done

A task is done only when it meets the [definition of done](docs/03-development-phases/definition-of-done.md), including its security items.
