# ADR-0006: Runtime and toolchain baseline

- **Status:** Accepted
- **Date:** 04 Nov 2026
- **Deciders:** Tech lead

## Context

The coding standards named Node 22 LTS, which reaches end of life on 30 Apr 2027, about six months before the planned go-live. Several tools had new major versions in 2026, and some plugins have not caught up: typescript-eslint supports only TypeScript below 6.1, and eslint-plugin-jsx-a11y supports only ESLint 9 or older. The supply chain must be defended from day one (security architecture §6).

## Options considered

1. **Node 22, the newest of every tool:** matches the old docs. But the runtime goes out of support before go-live, and TypeScript 7 breaks type-aware linting.
2. **Node 24 LTS:** supported until Apr 2028, so an upgrade would be needed soon after go-live.
3. **Node 26 LTS (Active LTS since Oct 2026), newest compatible tools, 7-day release cooldown:** supported until Apr 2029.

## Decision

Option 3:

- **Node 26.13.0.** pnpm downloads it into the project (`devEngines.runtime` in `package.json`), so every `pnpm` script runs on it whatever Node the machine has. CI reads `.node-version`.
- **pnpm 12.16.1**, Turborepo 2.11, **TypeScript 6.0.3** (not 7, until typescript-eslint supports it), ESLint 10 with typescript-eslint, Vitest 5, Prettier 3, dependency-cruiser 18, lefthook 2.
- **Supply chain:** `minimumReleaseAge: 10080` (7 days) in `pnpm-workspace.yaml`, the same in Renovate; exact versions only; dependency install scripts are blocked unless explicitly allowed in `allowBuilds`.
- **Accessibility lint (jsx-a11y) is not used** until it supports ESLint 10. Accessibility is enforced by axe in Storybook and Playwright.

Exact versions and reasons: [Phase 0 plan §3](../../03-development-phases/phase-0-plan.md#3-tools-and-versions).

## Consequences

- Runtime support runs well past go-live. The system Node on a developer machine does not matter for project scripts. Running `node` directly outside `pnpm` still uses the machine's version.
- A release that was compromised and caught within a week never reaches us. The cost is that urgent fixes also wait 7 days, unless a security update is let through manually (Renovate's vulnerability alerts skip the cooldown).
- TypeScript 7 (native compiler) is a later migration. We use only options that are not deprecated in 6.0.
- `allowBuilds` is a security file under code-owner review. Each entry records why a package's install script is allowed or denied.
