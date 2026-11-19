import { a } from './no-circular-a.ts';
export const b = (): unknown => a;
