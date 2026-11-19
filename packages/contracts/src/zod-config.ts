import { z } from 'zod';

// Zod otherwise probes for eval with `new Function` when it builds schemas, which the strict
// Content-Security-Policy reports as a violation. This must run before any schema exists, so
// src/index.ts imports this file first.
z.config({ jitless: true });
