import { z } from 'zod';

import type { RestrictedKind } from '@pitchforge/contracts';

import { SAMPLE_USERS } from './data/sample-company.ts';
import type { SampleRole, SampleUser } from './data/sample-company.ts';
import { SESSION_COOKIE } from './session.ts';

/** Reads the session cookie; MockRequest is defined in define.ts, which imports this file. */
interface CookieSource {
  readonly cookie: (name: string) => string | undefined;
}

export interface Viewer extends SampleUser {
  readonly role: SampleRole;
}

const ROLES = new Map(Object.entries(SAMPLE_USERS)) as ReadonlyMap<SampleRole, SampleUser>;

/** The sample user behind this request's session cookie. */
export function viewerOf(request: CookieSource): Viewer | undefined {
  const role = request.cookie(SESSION_COOKIE) as SampleRole | undefined;
  const user = role === undefined ? undefined : ROLES.get(role);
  return role === undefined || user === undefined ? undefined : { ...user, role };
}

/**
 * Which restricted fields each sample role may read, from the field rules in
 * docs/04-security/access-control-matrix.md. The real API decides this; the mock copies the
 * outcome, so screens are built against what each role will really receive.
 */
const FIELD_ACCESS = new Map<SampleRole, readonly RestrictedKind[]>([
  ['partner', ['salary', 'partner-balance', 'labour-cost']],
  ['finance', ['partner-balance', 'labour-cost', 'bank']],
  ['pm', []],
  ['employee', []],
]);

/** A person reads their own salary, bank details, NID and TIN. */
const OWN_FIELDS: readonly RestrictedKind[] = ['salary', 'bank', 'personal-bank', 'nid', 'tin'];

function isOwnRecord(value: Record<string, unknown>, viewer: Viewer): boolean {
  const person = value['employee'];
  return (
    value['userId'] === viewer.userId ||
    (typeof person === 'object' && person !== null && 'id' in person && person.id === viewer.userId)
  );
}

function restrictedKind(schema: z.ZodType): RestrictedKind | undefined {
  const kind = schema.meta()?.['x-restricted'];
  return typeof kind === 'string' ? (kind as RestrictedKind) : undefined;
}

function inner(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return inner(schema.unwrap() as z.ZodType);
  }
  return schema;
}

/** Drop the fields this viewer may not read, at any depth. */
export function withoutRestricted(schema: z.ZodType, value: unknown, viewer: Viewer): unknown {
  const shape = inner(schema);
  if (Array.isArray(value) && shape instanceof z.ZodArray) {
    return value.map((item: unknown) =>
      withoutRestricted(shape.element as z.ZodType, item, viewer),
    );
  }
  if (typeof value !== 'object' || value === null || !(shape instanceof z.ZodObject)) return value;

  const record = value as Record<string, unknown>;
  const allowed = new Set([
    ...(FIELD_ACCESS.get(viewer.role) ?? []),
    ...(isOwnRecord(record, viewer) ? OWN_FIELDS : []),
  ]);
  const fields = new Map<string, z.ZodType>(Object.entries(shape.shape));
  const kept: [string, unknown][] = [];
  for (const [key, field] of Object.entries(record)) {
    const fieldSchema = fields.get(key);
    if (fieldSchema === undefined) {
      kept.push([key, field]);
      continue;
    }
    const kind = restrictedKind(fieldSchema);
    if (kind !== undefined && !allowed.has(kind)) continue;
    kept.push([key, withoutRestricted(fieldSchema, field, viewer)]);
  }
  return Object.fromEntries(kept);
}
