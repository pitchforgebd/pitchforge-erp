import { pitchforgeProject } from '../packages/config/vitest/preset.ts';

export default pitchforgeProject('scripts', { include: ['**/*.test.ts'] });
