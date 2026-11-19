import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import * as contracts from '../src/index.ts';
import { ALL_ENDPOINTS, ERROR_STATUS, Problem } from '../src/index.ts';
import type { Endpoint, ErrorCode } from '../src/index.ts';
import { CONTRACT_VERSION } from '../src/version.ts';

import { namedSchemasInDependencyOrder } from './schema-walk.ts';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Definition = OpenAPIRegistry['definitions'][number];

const SESSION_SCHEME = 'session';

const STATUS_TEXT: Readonly<Record<number, string>> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No content',
  400: 'Bad request',
  401: 'Not signed in',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict',
  412: 'Record changed since it was read',
  422: 'Invalid or refused',
  423: 'Locked',
  429: 'Too many requests',
};

function errorResponses(errors: readonly ErrorCode[]) {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of errors) {
    const status = ERROR_STATUS[code];
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  return Object.fromEntries(
    [...byStatus.entries()]
      .sort(([a], [b]) => a - b)
      .map(([status, codes]) => [
        String(status),
        {
          description: `${STATUS_TEXT[status] ?? 'Error'}: ${codes.join(', ')}`,
          content: { 'application/problem+json': { schema: Problem } },
        },
      ]),
  );
}

function register(registry: OpenAPIRegistry, e: Endpoint) {
  const success =
    e.response === null
      ? { description: STATUS_TEXT[e.status] ?? 'OK' }
      : {
          description: STATUS_TEXT[e.status] ?? 'OK',
          content: { 'application/json': { schema: e.response } },
        };

  registry.registerPath({
    method: e.method.toLowerCase() as Method,
    path: e.path,
    operationId: e.id,
    summary: e.summary,
    tags: [e.module],
    security: e.public === true ? [] : [{ [SESSION_SCHEME]: [] }],
    request: {
      ...(e.params && { params: e.params }),
      ...(e.query && { query: e.query }),
      ...(e.headers && { headers: e.headers }),
      ...(e.body && {
        body: { required: true, content: { 'application/json': { schema: e.body } } },
      }),
    },
    responses: { [String(e.status)]: success, ...errorResponses(e.errors) },
    'x-feature-ids': [...e.featureIds],
    ...(e.movesMoney === true && { 'x-moves-money': true }),
    ...(e.sendsMessages === true && { 'x-sends-messages': true }),
    ...(e.stepUp === true && { 'x-step-up': true }),
  });
}

/** The OpenAPI 3.1 document for every endpoint. */
export function buildOpenApi(endpoints: readonly Endpoint[] = ALL_ENDPOINTS) {
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', SESSION_SCHEME, {
    type: 'apiKey',
    in: 'cookie',
    name: '__Host-pf_session',
    description: 'Opaque server-side session (ADR-0004).',
  });
  for (const endpoint of endpoints) register(registry, endpoint);

  // Named schemas go first, dependencies before dependents. The generator builds a component
  // from the first place it meets a schema, so meeting `Money.nullable()` inside another
  // schema first would make Money itself nullable.
  const exportedSchemas = Object.values(contracts).filter((v) => v instanceof z.ZodType);
  const namedSchemas = namedSchemasInDependencyOrder(exportedSchemas).map((schema): Definition => ({
    type: 'schema',
    schema,
  }));

  const document = new OpenApiGeneratorV31([
    ...namedSchemas,
    ...registry.definitions,
  ]).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Pitchforge ERP API',
      version: CONTRACT_VERSION,
      description: 'Generated from packages/contracts. Do not edit by hand.',
    },
    servers: [{ url: '/' }],
  });
  return fixNullableRefs(document);
}

/**
 * The generator writes a nullable reference as `allOf: [{ $ref }, { type: [T, 'null'] }]`.
 * `allOf` means both must hold, so null would fail the reference and the field would not
 * really be nullable. OpenAPI 3.1 spells it `anyOf: [{ $ref }, { type: 'null' }]`.
 */
export function fixNullableRefs<T>(node: T): T {
  if (Array.isArray(node)) return node.map(fixNullableRefs) as T;
  if (typeof node !== 'object' || node === null) return node;

  const { allOf, ...rest } = node as { allOf?: unknown } & Record<string, unknown>;
  const fixed = Object.fromEntries(
    Object.entries(rest).map(([key, value]) => [key, fixNullableRefs(value)]),
  );
  if (!Array.isArray(allOf)) return { ...fixed, ...(allOf !== undefined && { allOf }) } as T;

  const isNullMarker = (part: unknown) => {
    const type = (part as { type?: unknown }).type;
    return Array.isArray(type) && type.includes('null');
  };
  const parts = allOf as unknown[];
  const nullable = parts.some(isNullMarker);
  const others = parts.filter((part) => !isNullMarker(part));
  if (!nullable) return { ...fixed, allOf: fixNullableRefs(parts) } as T;
  return { ...fixed, anyOf: [...fixNullableRefs(others), { type: 'null' }] } as T;
}
