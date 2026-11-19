import { z } from 'zod';

import { Timestamp, Uuid } from './primitives.ts';

/** Audit columns and row version, on every record. `version` is the ETag for If-Match. */
export const AuditMeta = z
  .object({
    createdAt: Timestamp,
    createdBy: Uuid,
    updatedAt: Timestamp,
    updatedBy: Uuid,
    version: z.number().int().min(1),
  })
  .meta({ id: 'AuditMeta' });
export type AuditMeta = z.infer<typeof AuditMeta>;

/** Reference to a person or party with a display name, safe to show to any reader. */
export const PersonRef = z.object({ id: Uuid, name: z.string() }).meta({ id: 'PersonRef' });
export type PersonRef = z.infer<typeof PersonRef>;

/**
 * What the current user may do to this record, decided by the server. The UI renders buttons
 * from this list and never from role names; the API still enforces every action.
 */
export function allowedActions<const T extends readonly [string, ...string[]]>(actions: T) {
  return z.array(z.enum(actions));
}

/** Fields only some roles may read (docs/04-security/access-control-matrix.md). */
export const RESTRICTED_KINDS = [
  'salary',
  'bank',
  'nid',
  'tin',
  'partner-balance',
  'labour-cost',
] as const;
export type RestrictedKind = (typeof RESTRICTED_KINDS)[number];

/**
 * Mark a response field as restricted. It is optional because the API OMITS it for a caller
 * without the field permission; hiding it in the UI is never the control (rule R9).
 */
export function restricted<T extends z.ZodType>(schema: T, kind: RestrictedKind) {
  return schema.optional().meta({
    description: 'Omitted without field permission.',
    'x-restricted': kind,
  });
}

/** Record reference used by attachments, activity and search. */
export const RecordRef = z
  .strictObject({
    recordType: z.string().regex(/^[a-z][a-z_]*$/),
    recordId: Uuid,
  })
  .meta({ id: 'RecordRef' });
export type RecordRef = z.infer<typeof RecordRef>;
