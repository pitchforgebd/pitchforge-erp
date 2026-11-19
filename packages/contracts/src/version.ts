/**
 * Version of the API contract, published as OpenAPI `info.version`. Additive changes bump the
 * minor; a breaking change needs a major bump (and, once live, a v2 path with 6 months' overlap).
 * `pnpm contracts:diff` fails on a breaking change without a major bump.
 */
export const CONTRACT_VERSION = '1.0.0';
