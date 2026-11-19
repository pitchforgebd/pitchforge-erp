import { HttpResponse, http } from 'msw';
import type { HttpHandler } from 'msw';

import { ERROR_STATUS } from '@pitchforge/contracts';
import type { Endpoint, ErrorCode, ModuleName, Problem } from '@pitchforge/contracts';

import { pathPattern } from '../lib/api/routes.ts';

export type MockReply =
  | { readonly json: unknown; readonly cookies?: readonly string[] }
  | { readonly empty: true; readonly cookies?: readonly string[] }
  | { readonly problem: ErrorCode };

export interface MockRequest {
  readonly request: Request;
  /** Value of a request cookie. */
  readonly cookie: (name: string) => string | undefined;
  readonly path: string;
}

export interface MockHandler {
  readonly endpointId: string;
  readonly module: ModuleName;
  readonly handler: HttpHandler;
}

function cookieReader(request: Request) {
  const pairs = (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim());
  return (name: string) =>
    pairs.find((pair) => pair.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function problemBody(code: ErrorCode): Problem {
  return {
    type: 'about:blank',
    title: code,
    // eslint-disable-next-line security/detect-object-injection -- code is the ErrorCode union
    status: ERROR_STATUS[code],
    code,
    requestId: 'mock-request',
  };
}

function toResponse(endpoint: Endpoint, reply: MockReply): Response {
  if ('problem' in reply) {
    return HttpResponse.json(problemBody(reply.problem), {
      status: ERROR_STATUS[reply.problem],
      headers: { 'content-type': 'application/problem+json' },
    });
  }

  const headers = new Headers();
  for (const cookie of reply.cookies ?? []) headers.append('set-cookie', cookie);

  if ('empty' in reply) return new HttpResponse(null, { status: endpoint.status, headers });

  // A mock that drifts from its contract fails here, not in a screen.
  if (endpoint.response === null) throw new Error(`${endpoint.id} has no response body`);
  const json = endpoint.response.parse(reply.json) as Record<string, unknown>;
  return HttpResponse.json(json, { status: endpoint.status, headers });
}

/**
 * A mock for one contract endpoint. It returns fixed sample data: mocks hold no accounting,
 * tax or permission logic (CLAUDE.md rule 2).
 */
export function mock(
  endpoint: Endpoint,
  resolve: (request: MockRequest) => MockReply | Promise<MockReply>,
): MockHandler {
  // eslint-disable-next-line security/detect-non-literal-regexp -- built from contract constants, with literals escaped
  const pattern = new RegExp(`${pathPattern(endpoint.path)}$`);
  const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
  // eslint-disable-next-line security/detect-object-injection -- method is one of the five above
  const handler = http[method](pattern, async ({ request }) => {
    const reply = await resolve({
      request,
      cookie: cookieReader(request),
      path: new URL(request.url).pathname,
    });
    return toResponse(endpoint, reply);
  });
  return { endpointId: endpoint.id, module: endpoint.module, handler };
}
