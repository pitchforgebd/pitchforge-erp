// @ts-check
/**
 * Module boundary rules (docs/02-architecture/module-boundaries.md). Run: pnpm check:boundaries.
 * Each rule has a violation fixture in packages/config/test/fixtures/boundaries.
 *
 * Capture groups: in rules whose from.path is `^apps/([^/]+)/src/modules/([^/]+)/`,
 * $1 is the app and $2 the module, and can be referenced in to.path / to.pathNot.
 */

const MODULES = '^apps/[^/]+/src/modules/';
const BUSINESS = '(partners|crm|billing|projects|hr|payroll|procurement)';
// String.raw keeps the regex backslashes literal (a plain '\.' string is just '.').
const TESTS = String.raw`(\.test\.tsx?$|\.spec\.tsx?$|\.stories\.tsx?$|/test/|/tests/|vitest\.config\.ts$|playwright\.config\.ts$)`;
const SERVER_ONLY_PACKAGES =
  '(^|/)node_modules/(pg|ioredis|bullmq|kysely|drizzle-orm|@prisma|@nestjs)/';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make module order and boundaries impossible to reason about.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'Every import must resolve (catches typos and undeclared dependencies).',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'packages-not-to-apps',
      severity: 'error',
      comment: 'Shared packages must not depend on applications.',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'web-not-to-backend',
      severity: 'error',
      comment:
        'The web app holds no database or queue access and never imports API or worker code.',
      from: { path: '^apps/web/' },
      to: { path: ['^apps/(api|worker)/', SERVER_ONLY_PACKAGES] },
    },
    {
      name: 'web-app-not-to-mocks',
      severity: 'error',
      comment: 'Screens and the BFF never import mock code; only instrumentation.ts starts it.',
      from: { path: '^apps/web/(app|features|lib)/', pathNot: TESTS },
      to: { path: ['^apps/web/mocks/', '^packages/contracts/fixtures/', '(^|/)node_modules/msw/'] },
    },
    {
      name: 'backend-not-to-web',
      severity: 'error',
      from: { path: '^apps/(api|worker)/' },
      to: { path: '^apps/web/' },
    },
    {
      name: 'module-public-only',
      severity: 'error',
      comment: 'Other modules may be imported only through their public/ folder (rule 2).',
      from: { path: `^apps/([^/]+)/src/modules/([^/]+)/` },
      to: {
        path: MODULES,
        pathNot: ['^apps/[^/]+/src/modules/$2/', `${MODULES}[^/]+/public/`],
      },
    },
    {
      name: 'core-depends-on-nothing',
      severity: 'error',
      comment: 'Dependencies point down only: core is the bottom layer (rule 4).',
      from: { path: `^apps/([^/]+)/src/modules/core/` },
      to: { path: MODULES, pathNot: `${MODULES}core/` },
    },
    {
      name: 'accounting-depends-on-core-only',
      severity: 'error',
      from: { path: `^apps/([^/]+)/src/modules/accounting/` },
      to: { path: MODULES, pathNot: `${MODULES}(accounting|core)/` },
    },
    {
      name: 'business-modules-not-sideways',
      severity: 'error',
      comment: 'Business modules never call each other; sideways flows are events (rule 5).',
      from: { path: `^apps/([^/]+)/src/modules/${BUSINESS}/` },
      to: {
        path: MODULES,
        pathNot: [`${MODULES}(accounting|core)/`, '^apps/[^/]+/src/modules/$2/'],
      },
    },
    {
      name: 'nothing-depends-on-reporting',
      severity: 'error',
      comment: 'Reporting is the top layer: it reads others, nobody imports it.',
      from: { path: MODULES, pathNot: `${MODULES}reporting/` },
      to: { path: `${MODULES}reporting/` },
    },
    {
      name: 'domain-framework-free',
      severity: 'error',
      comment:
        'Domain code has no framework or infrastructure imports (coding standards, backend rule 2).',
      from: { path: '/domain/' },
      to: {
        path: [
          SERVER_ONLY_PACKAGES,
          '(^|/)node_modules/(express|fastify|zod)/',
          '^@nestjs/',
          '/(interface|infrastructure)/',
        ],
      },
    },
    {
      name: 'shared-kernel-dependency-free',
      severity: 'error',
      comment:
        'The shared kernel runs in Node and the browser with no runtime dependencies at all.',
      from: { path: '^packages/shared-kernel/', pathNot: TESTS },
      to: {
        dependencyTypes: [
          'npm',
          'npm-dev',
          'npm-optional',
          'npm-peer',
          'npm-no-pkg',
          'npm-unknown',
          'core',
        ],
      },
    },
    {
      name: 'contracts-only-zod-and-kernel',
      severity: 'error',
      comment: 'Contracts depend only on zod and the shared kernel.',
      from: { path: '^packages/contracts/src/', pathNot: TESTS },
      to: {
        pathNot: ['^packages/contracts/', '^packages/shared-kernel/', '(^|/)node_modules/zod/'],
      },
    },
    {
      name: 'not-to-test',
      severity: 'error',
      comment: 'Production code must not import test code.',
      from: { pathNot: TESTS },
      to: { path: TESTS },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment: 'Production code must not import devDependencies.',
      from: { path: '^(apps|packages)/[^/]+/src/', pathNot: TESTS },
      // A peer dependency (react in packages/ui) is also listed under devDependencies for local
      // tooling; the consuming app provides it at runtime, so it is not dev-only.
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['npm-peer'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        String.raw`(^|/)(dist|\.next|\.turbo|coverage|storybook-static)/`,
        '^packages/config/test/fixtures/',
        // Generated by Next.js; it references Next's internal types.
        '^apps/web/next-env\\.d\\.ts$',
      ],
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.mts', '.js', '.mjs', '.cjs', '.json'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
