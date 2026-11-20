import { ERROR_STATUS } from '@pitchforge/contracts';
import type { Endpoint, ErrorCode, Problem } from '@pitchforge/contracts';

import { serverConfig } from '../config/env.ts';

import { publicOrigin, withLocalStorageLinks } from './mock-storage.ts';
import { matchEndpoint } from './routes.ts';

/** Only these request headers reach the API. */
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'cookie',
  'idempotency-key',
  'if-match',
] as const;

const SAFE_METHODS = new Set(['GET', 'HEAD']);

function problem(code: ErrorCode, title: string): Response {
  // eslint-disable-next-line security/detect-object-injection -- code is the ErrorCode union
  const status = ERROR_STATUS[code];
  const body: Problem = {
    type: 'about:blank',
    title,
    status,
    code,
    requestId: globalThis.crypto.randomUUID(),
  };
  return Response.json(body, {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });
}

/**
 * CSRF defence for cookie-authenticated writes: the browser sets Origin and Sec-Fetch-Site on
 * cross-site requests and scripts cannot forge them. A write must come from this origin.
 */
export function isSameOriginWrite(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return true;
  if (request.headers.get('sec-fetch-site') !== 'same-origin') return false;
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (origin === null || host === null) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** In development a response that breaks its contract fails loudly instead of reaching the UI. */
async function contractViolation(endpoint: Endpoint, response: Response): Promise<boolean> {
  if (serverConfig().production || !response.ok || endpoint.response === null) return false;
  const body: unknown = await response.clone().json();
  return !endpoint.response.safeParse(body).success;
}

/** The backend-for-frontend: forward a request for a known endpoint, and nothing else. */
export async function forwardToApi(
  request: Request,
  segments: readonly string[],
): Promise<Response> {
  if (!isSameOriginWrite(request)) return problem('FORBIDDEN', 'Cross-site request refused');

  const path = `/api/v1/${segments.join('/')}`;
  const endpoint = matchEndpoint(request.method, path);
  if (endpoint === null) return problem('NOT_FOUND', 'No such endpoint');

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  const search = new URL(request.url).search;
  const body = SAFE_METHODS.has(request.method) ? null : await request.text();
  const upstream = await fetch(`${serverConfig().apiUrl}${path}${search}`, {
    method: request.method,
    headers,
    cache: 'no-store',
    redirect: 'error',
    ...(body !== null && body !== '' && { body }),
  });

  if (await contractViolation(endpoint, upstream)) {
    return problem('VALIDATION', `Response of ${endpoint.id} breaks its contract`);
  }

  // Mock mode only: signed storage links point at the stand-in storage on this origin.
  if (
    serverConfig().apiMode === 'mock' &&
    upstream.ok &&
    (endpoint.id === 'core.createUpload' || endpoint.id === 'core.createDownload')
  ) {
    const body = withLocalStorageLinks(await upstream.json(), publicOrigin(request));
    return Response.json(body, { status: upstream.status });
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType !== null) responseHeaders.set('content-type', contentType);
  for (const cookie of upstream.headers.getSetCookie())
    responseHeaders.append('set-cookie', cookie);

  const hasBody = upstream.status !== 204;
  return new Response(hasBody ? upstream.body : null, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
