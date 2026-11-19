import type { z } from 'zod';

import { Problem } from '@pitchforge/contracts';
import type { Endpoint, ErrorCode } from '@pitchforge/contracts';

import { fillPath } from './routes.ts';

/** A problem+json error from the API, with its stable code. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId: string;

  constructor(problem: Problem) {
    super(problem.title);
    this.code = problem.code;
    this.status = problem.status;
    this.requestId = problem.requestId;
  }
}

type Param<E, K extends string, Name extends string> =
  E extends Record<K, infer S extends z.ZodType>
    ? Record<Name, z.input<S>>
    : Partial<Record<Name, never>>;

export type CallOptions<E> = Param<E, 'params', 'params'> &
  Param<E, 'query', 'query'> &
  Param<E, 'body', 'body'> & {
    /** The record's version, for writes that require If-Match. */
    readonly ifMatch?: string;
  };

export type CallResult<E> = E extends { response: infer S extends z.ZodType }
  ? z.output<S>
  : undefined;

/** Sends a request. The path is the contract path, e.g. /api/v1/core/auth:login. */
export type Transport = (path: string, init: RequestInit) => Promise<Response>;

function queryString(query: unknown): string {
  const search = new URLSearchParams();
  const entries = Object.entries((query ?? {}) as Record<string, string | number | boolean | null>);
  for (const [key, value] of entries) {
    if (value !== null) search.set(key, String(value));
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
}

/**
 * Call an endpoint with the types from its contract. The Idempotency-Key is generated once per
 * call, so a double click cannot move money twice; responses are parsed against the contract.
 */
export async function callEndpoint<E extends Endpoint>(
  endpoint: E,
  options: CallOptions<E>,
  transport: Transport,
): Promise<CallResult<E>> {
  const { params, query, body, ifMatch } = options as {
    params?: Record<string, string>;
    query?: unknown;
    body?: unknown;
    ifMatch?: string;
  };

  const headers = new Headers({ accept: 'application/json' });
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (endpoint.headers?.shape['idempotency-key'] !== undefined) {
    headers.set('idempotency-key', globalThis.crypto.randomUUID());
  }
  if (ifMatch !== undefined) headers.set('if-match', ifMatch);

  const response = await transport(
    `${fillPath(endpoint.path, params ?? {})}${queryString(query)}`,
    {
      method: endpoint.method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    },
  );

  if (!response.ok) throw new ApiError(Problem.parse(await response.json()));
  if (endpoint.response === null) return undefined as CallResult<E>;
  return endpoint.response.parse(await response.json()) as CallResult<E>;
}
