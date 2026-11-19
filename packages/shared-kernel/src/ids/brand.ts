/** A nominal type: `Brand<string, 'Uuid'>` is a string that only a validator can produce. */
export type Brand<T, B extends string> = T & { readonly __brand: B };
