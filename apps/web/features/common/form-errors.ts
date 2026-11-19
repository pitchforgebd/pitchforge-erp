import type { z } from 'zod';

/**
 * Field errors from a contract schema, keyed by the field's path ("net", "lines.0.debit").
 * Screens validate with the same schema the API uses, so the rules live in one place.
 */
export function fieldErrors(result: z.ZodSafeParseResult<unknown>): ReadonlyMap<string, string> {
  if (result.success) return new Map();
  const errors = new Map<string, string>();
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join('.');
    if (!errors.has(key)) errors.set(key, issue.message);
  }
  return errors;
}

/** Spread onto a Field: its error, if the last submit found one. */
export function errorFor(errors: ReadonlyMap<string, string>, key: string): { error?: string } {
  const message = errors.get(key);
  return message === undefined ? {} : { error: message };
}
