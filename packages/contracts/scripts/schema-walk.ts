import { z } from 'zod';

/** The schemas directly inside a schema. */
export function childSchemas(schema: z.ZodType): readonly z.ZodType[] {
  if (schema instanceof z.ZodObject) return Object.values(schema.shape) as z.ZodType[];
  if (schema instanceof z.ZodArray) return [schema.element as z.ZodType];
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return [schema.unwrap() as z.ZodType];
  }
  if (schema instanceof z.ZodDefault) return [schema.def.innerType as z.ZodType];
  if (schema instanceof z.ZodUnion) return schema.options as readonly z.ZodType[];
  if (schema instanceof z.ZodRecord) return [schema.valueType as z.ZodType];
  return [];
}

/** Name of a schema registered with `.meta({ id })`. */
export function schemaId(schema: z.ZodType): string | undefined {
  const id = schema.meta()?.id;
  return typeof id === 'string' ? id : undefined;
}

/** Named schemas with dependencies first: a schema comes after every schema it contains. */
export function namedSchemasInDependencyOrder(roots: Iterable<z.ZodType>): z.ZodType[] {
  const seen = new Set<z.ZodType>();
  const ordered: z.ZodType[] = [];
  function visit(schema: z.ZodType): void {
    if (seen.has(schema)) return;
    seen.add(schema);
    for (const child of childSchemas(schema)) visit(child);
    if (schemaId(schema) !== undefined) ordered.push(schema);
  }
  for (const root of roots) visit(root);
  return ordered;
}

export interface FieldVisit {
  /** Dotted path from the root, e.g. `lines[].debit`. */
  readonly path: string;
  /** The object key this schema sits under, if any. */
  readonly key: string | undefined;
  readonly schema: z.ZodType;
}

/** Visit a schema and everything inside it. */
export function walkFields(
  schema: z.ZodType,
  visit: (field: FieldVisit) => void,
  path = '',
  key?: string,
): void {
  visit({ path, key, schema });
  if (schema instanceof z.ZodObject) {
    for (const [name, child] of Object.entries(schema.shape)) {
      walkFields(child as z.ZodType, visit, path === '' ? name : `${path}.${name}`, name);
    }
    return;
  }
  for (const child of childSchemas(schema)) {
    walkFields(child, visit, schema instanceof z.ZodArray ? `${path}[]` : path, key);
  }
}
