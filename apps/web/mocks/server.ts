import { setupServer } from 'msw/node';
import type { SetupServer } from 'msw/node';

import { coreRecordHandlers } from './handlers/core-records.ts';
import { coreHandlers } from './handlers/core.ts';
import { generatedHandlers } from './handlers/generated.ts';

/** Mock handlers except for modules already switched to the real API. */
export function mockHandlers(realModules: readonly string[]) {
  return [...coreHandlers, ...coreRecordHandlers, ...generatedHandlers]
    .filter(({ module }) => !realModules.includes(module))
    .map(({ handler }) => handler);
}

export function startMockServer(realModules: readonly string[]): SetupServer {
  const server = setupServer(...mockHandlers(realModules));
  // Unmocked requests fail loudly instead of reaching the network.
  server.listen({ onUnhandledFrame: realModules.length > 0 ? 'bypass' : 'error' });
  return server;
}
