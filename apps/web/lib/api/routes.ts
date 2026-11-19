import { ALL_ENDPOINTS } from '@pitchforge/contracts';
import type { Endpoint } from '@pitchforge/contracts';

/** Regex source for a contract path: `{id}` matches one segment, everything else literally. */
export function pathPattern(path: string): string {
  return path
    .split(/(\{[a-zA-Z]+\})/)
    .map((part) =>
      part.startsWith('{') ? '[^/:]+' : part.replace(/[.*+?^${}()|[\]\\/]/g, String.raw`\$&`),
    )
    .join('');
}

function compile(endpoint: Endpoint): { readonly endpoint: Endpoint; readonly regex: RegExp } {
  // eslint-disable-next-line security/detect-non-literal-regexp -- built from contract constants, with literals escaped
  return { endpoint, regex: new RegExp(`^${pathPattern(endpoint.path)}$`) };
}

const COMPILED = ALL_ENDPOINTS.map(compile);

/** The endpoint for a method and path, or null. The BFF forwards nothing else. */
export function matchEndpoint(method: string, path: string): Endpoint | null {
  const found = COMPILED.find((c) => c.endpoint.method === method && c.regex.test(path));
  return found?.endpoint ?? null;
}

/** Fill `{id}` placeholders, percent-encoding each value. */
export function fillPath(path: string, params: Readonly<Record<string, string>>): string {
  return path.replace(/\{([a-zA-Z]+)\}/g, (_match, name: string) => {
    const value = Object.entries(params).find(([key]) => key === name)?.[1];
    if (value === undefined) throw new Error(`Missing path parameter: ${name}`);
    return encodeURIComponent(value);
  });
}
