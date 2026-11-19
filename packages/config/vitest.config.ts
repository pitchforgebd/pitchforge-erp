import { pitchforgeProject } from './vitest/preset.ts';

export default pitchforgeProject('config', {
  include: ['test/**/*.test.ts'],
  // The first rule test builds a type-checked TypeScript program, which takes several seconds
  // when the whole workspace runs at once under coverage.
  testTimeout: 30_000,
});
