import { z } from 'zod';

import { VALID_EXAMPLES } from './examples.ts';

const examples = new Map(Object.entries(VALID_EXAMPLES));

/**
 * A fixed sample value for any response schema, built from the examples. The mock server uses
 * this for endpoints with no hand-written handler, so every screen has data from day one and
 * no mock holds any logic.
 */
export function sampleFor(schema: z.ZodType): unknown {
  const id = schema.meta()?.id;
  if (typeof id === 'string' && examples.has(id)) return examples.get(id);

  if (schema instanceof z.ZodOptional) return sampleFor(schema.unwrap() as z.ZodType);
  if (schema instanceof z.ZodNullable) return null;
  if (schema instanceof z.ZodLiteral) return schema.value;
  if (schema instanceof z.ZodEnum) return schema.options[0];
  if (schema instanceof z.ZodArray) return [sampleFor(schema.element as z.ZodType)];
  if (schema instanceof z.ZodObject) {
    return Object.fromEntries(
      Object.entries(schema.shape).map(([key, field]) => [key, sampleFor(field as z.ZodType)]),
    );
  }
  throw new Error(`No sample for this schema: add a named example (${schema.def.type})`);
}
