import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Agent instructions in this repository live in CLAUDE.md, not in a generated file.
  agentRules: false,
  // Workspace packages are consumed as TypeScript source.
  transpilePackages: ['@pitchforge/contracts', '@pitchforge/shared-kernel', '@pitchforge/ui'],
  // Fixed at build time, so a production image holds no mock code at all (ADR-0008).
  env: { MOCK_API_INCLUDED: process.env['BUILD_WITHOUT_MOCKS'] === 'true' ? 'false' : 'true' },
  // Images only; `next start` needs the normal output.
  ...(process.env['BUILD_STANDALONE'] === 'true' ? { output: 'standalone' as const } : {}),
};

export default withNextIntl(config);
