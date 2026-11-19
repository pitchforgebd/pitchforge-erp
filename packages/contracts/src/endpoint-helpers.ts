import type { z } from 'zod';

import { IdParams } from './endpoint.ts';
import { listQuery, page } from './shared/pagination.ts';

type Features = readonly [string, ...string[]];

/** `GET /things`: a paged list. */
export function listOf<T extends z.ZodType, const F extends z.ZodRawShape = Record<string, never>>(
  path: string,
  summary: string,
  featureIds: Features,
  item: T,
  filters?: F,
) {
  return {
    method: 'GET',
    path,
    summary,
    featureIds,
    list: true,
    query: listQuery((filters ?? {}) as F),
    response: page(item),
  } as const;
}

/** `GET /things/{id}`, or any read of one record. */
export function getOne<T extends z.ZodType>(
  path: string,
  summary: string,
  featureIds: Features,
  response: T,
) {
  return { method: 'GET', path, summary, featureIds, params: IdParams, response } as const;
}

/** `POST /things`: returns 201 with the new record. */
export function createOne<B extends z.ZodObject, T extends z.ZodType>(
  path: string,
  summary: string,
  featureIds: Features,
  body: B,
  response: T,
) {
  return { method: 'POST', path, summary, featureIds, body, status: 201, response } as const;
}

/** `PATCH /things/{id}`: needs If-Match. */
export function updateOne<B extends z.ZodObject, T extends z.ZodType>(
  path: string,
  summary: string,
  featureIds: Features,
  body: B,
  response: T,
) {
  return {
    method: 'PATCH',
    path,
    summary,
    featureIds,
    params: IdParams,
    body,
    response,
  } as const;
}

/** `POST /things/{id}:command`: needs If-Match. Refused from the wrong state. */
export function command<T extends z.ZodType>(
  path: string,
  summary: string,
  featureIds: Features,
  response: T,
) {
  return {
    method: 'POST',
    path,
    summary,
    featureIds,
    params: IdParams,
    response,
    errors: ['INVALID_STATE'],
  } as const;
}
