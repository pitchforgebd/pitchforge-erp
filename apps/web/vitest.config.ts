import { pitchforgeProject } from '@pitchforge/config/vitest';

export default pitchforgeProject('web', {
  include: ['lib/**/*.test.{ts,tsx}', 'mocks/**/*.test.ts'],
});
