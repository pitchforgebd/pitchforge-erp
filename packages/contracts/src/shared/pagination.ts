import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/** Every list endpoint accepts this: `?limit=50&cursor=…&sort=-date`. */
export const CursorQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().min(1).max(512).optional(),
  sort: z
    .string()
    .regex(/^-?[a-zA-Z]+$/, 'Sort is a field name, with "-" for descending')
    .optional(),
});

/** A list query with resource-specific filters. */
export function listQuery<T extends z.ZodRawShape>(filters: T) {
  return CursorQuery.extend(filters);
}

/** A page of results. `nextCursor` is null on the last page. */
export function page<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}
