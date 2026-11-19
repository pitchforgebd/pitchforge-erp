import type { Endpoint } from '@pitchforge/contracts';

import { callEndpoint } from './client.ts';
import type { CallOptions, CallResult } from './client.ts';

export const BFF_PREFIX = '/bff/v1';

/**
 * Call the API from the browser. It only ever talks to the same-origin BFF, with the HTTP-only
 * cookie the browser attaches itself; no token is reachable from JavaScript.
 */
export function browserCall<E extends Endpoint>(
  endpoint: E,
  options: CallOptions<E>,
): Promise<CallResult<E>> {
  return callEndpoint(endpoint, options, (path, init) =>
    fetch(`${BFF_PREFIX}${path.slice('/api/v1'.length)}`, {
      ...init,
      credentials: 'same-origin',
    }),
  );
}
