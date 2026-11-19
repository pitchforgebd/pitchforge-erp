import { pitchforgeProject } from '@pitchforge/config/vitest';

// Plain unit tests. Stories run in a browser through vitest.storybook.config.ts.
export default pitchforgeProject('ui', { include: ['src/**/*.test.{ts,tsx}'] });
