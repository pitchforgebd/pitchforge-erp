import { z } from 'zod';

import type { Endpoint } from '@pitchforge/contracts';

import { mock } from './define.ts';
import type { MockHandler, MockReply, MockRequest } from './define.ts';
import { viewerOf, withoutRestricted } from './restrict.ts';
import type { Viewer } from './restrict.ts';

export { viewerOf, withoutRestricted };
export type { Viewer };

/** Rows a list can hold: any record, optionally different per viewer. */
export type Rows =
  readonly object[] | ((viewer: Viewer, request: MockRequest) => readonly object[]);

function rowsFor(
  rows: Rows,
  viewer: Viewer,
  request: MockRequest,
): readonly Record<string, unknown>[] {
  return (typeof rows === 'function' ? rows(viewer, request) : rows) as readonly Record<
    string,
    unknown
  >[];
}

const PAGING = new Set(['limit', 'cursor', 'sort']);

/** A filter the generic equality match cannot express, such as `assignedToMe`. */
export type Filter = (row: Record<string, unknown>, value: string, viewer: Viewer) => boolean;

function nestedId(value: unknown): unknown {
  return typeof value === 'object' && value !== null && 'id' in value ? value.id : value;
}

/**
 * Keep rows whose field equals each query value: `?status=pending`, `?projectId=…` (matched
 * against `projectId` or `project.id`). A lookup, not a business rule.
 */
function matches(
  row: Record<string, unknown>,
  query: URLSearchParams,
  viewer: Viewer,
  filters: Readonly<Record<string, Filter>>,
): boolean {
  const custom = new Map(Object.entries(filters));
  const fields = new Map(Object.entries(row));
  for (const [key, value] of query) {
    if (PAGING.has(key)) continue;
    const filter = custom.get(key);
    if (filter !== undefined) {
      if (!filter(row, value, viewer)) return false;
      continue;
    }
    const field = fields.has(key) ? fields.get(key) : fields.get(key.replace(/Id$/, ''));
    if (field === undefined) continue;
    if (String(nestedId(field)) !== value) return false;
  }
  return true;
}

function itemSchemaOf(endpoint: Endpoint): z.ZodType {
  const response = endpoint.response;
  if (response instanceof z.ZodObject && 'items' in response.shape) {
    return (response.shape['items'] as z.ZodArray<z.ZodType>).element;
  }
  throw new Error(`${endpoint.id} is not a list endpoint`);
}

function withViewer(request: MockRequest, reply: (viewer: Viewer) => MockReply): MockReply {
  const viewer = viewerOf(request);
  return viewer === undefined ? { problem: 'UNAUTHENTICATED' } : reply(viewer);
}

export interface ListOptions {
  readonly filters?: Readonly<Record<string, Filter>>;
}

/** A list endpoint answered from fixed rows, filtered and shaped for the viewer. One page. */
export function serveList(endpoint: Endpoint, rows: Rows, options: ListOptions = {}): MockHandler {
  const item = itemSchemaOf(endpoint);
  return mock(endpoint, (request) =>
    withViewer(request, (viewer) => {
      const query = new URL(request.request.url).searchParams;
      const items = rowsFor(rows, viewer, request)
        .filter((row) => matches(row, query, viewer, options.filters ?? {}))
        .map((row) => withoutRestricted(item, row, viewer));
      return { json: { items, nextCursor: null } };
    }),
  );
}

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The record id inside a nested path such as /payees/{id}/payments. */
export function parentIdOf(request: MockRequest): string {
  return request.path.split('/').find((segment) => UUID_SEGMENT.test(segment)) ?? '';
}

/** The `{id}` in a request path such as /api/v1/core/approvals/{id} or …/{id}:approve. */
export function idOf(request: MockRequest): string {
  const tail = request.path.split('/').at(-1) ?? '';
  return tail.split(':')[0] ?? '';
}

/** A detail endpoint answered from the same rows: 404 for an id that is not there. */
export function serveOne(endpoint: Endpoint, rows: Rows, key = 'id'): MockHandler {
  return mock(endpoint, (request) =>
    withViewer(request, (viewer) => {
      const wanted = idOf(request);
      const row = rowsFor(rows, viewer, request).find(
        (candidate) => String(new Map(Object.entries(candidate)).get(key)) === wanted,
      );
      if (row === undefined || endpoint.response === null) return { problem: 'NOT_FOUND' };
      return { json: withoutRestricted(endpoint.response, row, viewer) };
    }),
  );
}

/** A fixed value for the viewer, for single-object endpoints such as dashboards. */
export function serveValue(
  endpoint: Endpoint,
  value: (viewer: Viewer, request: MockRequest) => unknown,
): MockHandler {
  return mock(endpoint, (request) =>
    withViewer(request, (viewer) => {
      if (endpoint.response === null) return { empty: true };
      const result = value(viewer, request);
      return result === undefined
        ? { problem: 'NOT_FOUND' }
        : { json: withoutRestricted(endpoint.response, result, viewer) };
    }),
  );
}
