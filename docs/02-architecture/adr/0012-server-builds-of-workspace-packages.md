# ADR-0012: Workspace packages build to `dist` for server images

- **Status:** Accepted
- **Date:** 06 Nov 2026
- **Deciders:** Tech lead

## Context

`packages/contracts` and `packages/shared-kernel` export TypeScript source. That suits Next.js, Vitest and Node scripts. A server image is different: `pnpm deploy` copies packages into `node_modules`, and Node refuses to strip types there. NestJS decorators are also not erasable syntax. Images must hold no tests, fixtures or sample data.

## Options considered

1. **Bundle the API with esbuild:** one file, but it needs special handling for Nest and pino, and one more tool.
2. **Run the source with a loader in production:** adds a compiler to the runtime image.
3. **Build `dist` with `tsc` and select it with a Node condition:** a package's `exports` keeps pointing at source by default, and `--conditions=dist` selects the build.

## Decision

Option 3. Both packages export `{ "dist": …, "default": "./src/index.ts" }` and list only `dist` in `files`. `apps/api` compiles against the `dist` condition and starts with `node --conditions=dist`.

## Consequences

- Development and tests are unchanged. `pnpm --filter @pitchforge/api deploy --prod` gives a folder with no sources, tests or fixtures.
- `turbo build` builds packages before the API, through `^build`.
- Starting `dist/main.js` without the flag loads TypeScript source from `node_modules` and fails, loudly.
- The Docker build stage is glibc and the final stage is Alpine, because pnpm's pinned Node has no musl download. This works only while the final stage runs pure JavaScript; a native dependency would force both stages onto one libc.
- Dropped from the plan: `@nestjs/cli` (plain `tsc` does the job) and `@nestjs/terminus` (a 30-line readiness check gives a smaller response and fewer dependencies).
