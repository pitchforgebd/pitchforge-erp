import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildOpenApi, fixNullableRefs } from '../scripts/build-openapi.ts';
import { ALL_ENDPOINTS } from '../src/index.ts';
import { CONTRACT_VERSION } from '../src/version.ts';

interface Operation {
  operationId: string;
  security: unknown[];
  parameters?: { name: string; in: string; required?: boolean }[];
  responses: Record<string, { content?: Record<string, unknown> }>;
}

const document = buildOpenApi();
const text = JSON.stringify(document);
const schemas = (document.components?.schemas ?? {}) as Record<
  string,
  { type?: unknown; properties?: Record<string, Record<string, unknown>> }
>;
const operations = Object.values(document.paths ?? {}).flatMap(
  (item) => Object.values(item) as Operation[],
);
const operation = (id: string) => operations.find((o) => o.operationId === id);

describe('generated OpenAPI', () => {
  it('is OpenAPI 3.1 at the contract version', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(document.info.version).toBe(CONTRACT_VERSION);
  });

  it('has one operation per endpoint', () => {
    expect(operations.map((o) => o.operationId).sort()).toEqual(
      ALL_ENDPOINTS.map((e) => e.id).sort(),
    );
  });

  it('matches the committed file (run pnpm contracts:openapi)', () => {
    const file = path.join(import.meta.dirname, '..', 'openapi', 'openapi.v1.json');
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(JSON.parse(text));
  });

  it('no component is nullable in itself', () => {
    const nullable = Object.entries(schemas)
      .filter(([, s]) => Array.isArray(s.type) && s.type.includes('null'))
      .map(([name]) => name);
    expect(nullable).toEqual([]);
  });

  it('nullable references really accept null', () => {
    expect(text).not.toContain('"allOf"');
    expect(schemas['ApprovalRequest']?.properties?.['amount']).toEqual({
      anyOf: [{ $ref: '#/components/schemas/Money' }, { type: 'null' }],
    });
  });

  it('money is a string on the wire', () => {
    expect(schemas['Money']?.properties?.['amount']?.['type']).toBe('string');
  });

  it('request bodies reject unknown fields', () => {
    expect((schemas['CreateVendorBill'] as Record<string, unknown>)['additionalProperties']).toBe(
      false,
    );
  });

  it('restricted fields are marked and not required', () => {
    const partner = schemas['Partner'] as { required: string[] };
    expect(schemas['Partner']?.properties?.['capitalBalance']?.['x-restricted']).toBe(
      'partner-balance',
    );
    expect(partner.required).not.toContain('capitalBalance');
  });

  it('states the idempotency and version headers, and problem+json errors', () => {
    const approve = operation('core.approve');
    const headers = approve?.parameters?.filter((p) => p.in === 'header').map((p) => p.name);
    expect(headers).toEqual(['idempotency-key', 'if-match']);
    expect(Object.keys(approve?.responses['409']?.content ?? {})).toEqual([
      'application/problem+json',
    ]);
  });

  it('only sign-in endpoints skip the session requirement', () => {
    expect(operation('core.login')?.security).toEqual([]);
    expect(operation('accounting.listVendorBills')?.security).toEqual([{ session: [] }]);
  });
});

describe('fixNullableRefs', () => {
  const ref = { $ref: '#/x' };

  it('rewrites a nullable reference at any depth', () => {
    expect(fixNullableRefs({ a: [{ b: { allOf: [ref, { type: ['object', 'null'] }] } }] })).toEqual(
      {
        a: [{ b: { anyOf: [ref, { type: 'null' }] } }],
      },
    );
  });

  it('leaves other allOf uses and plain values alone', () => {
    const untouched = { allOf: [ref, { description: 'x' }], n: 1, s: 'x', z: null };
    expect(fixNullableRefs(untouched)).toEqual(untouched);
  });
});
