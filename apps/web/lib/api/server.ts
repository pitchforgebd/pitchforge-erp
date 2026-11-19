import 'server-only';

import { cookies } from 'next/headers';

import type { Endpoint } from '@pitchforge/contracts';

import { serverConfig } from '../config/env.ts';

import { callEndpoint } from './client.ts';
import type { CallOptions, CallResult } from './client.ts';

/** Call the API from a server component, with the visitor's cookies. */
export async function serverCall<E extends Endpoint>(
  endpoint: E,
  options: CallOptions<E>,
): Promise<CallResult<E>> {
  const cookieHeader = (await cookies()).toString();
  return callEndpoint(endpoint, options, (path, init) => {
    const headers = new Headers(init.headers);
    if (cookieHeader !== '') headers.set('cookie', cookieHeader);
    return fetch(`${serverConfig().apiUrl}${path}`, { ...init, headers, cache: 'no-store' });
  });
}
