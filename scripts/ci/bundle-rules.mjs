// @ts-check
/** What must never appear in a file sent to the browser (frontend security rule 3). */
export const FORBIDDEN_IN_BUNDLE = [
  { name: 'mock code (msw)', pattern: /setupServer|mswjs|onUnhandledFrame/ },
  { name: 'mock sample data', pattern: /pitchforge\.example/ },
  { name: 'server secret name', pattern: /SESSION_SECRET|FIELD_ENCRYPTION_KEY|S3_SECRET_KEY/ },
  { name: 'server environment name', pattern: /DATABASE_URL|REDIS_URL/ },
  { name: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'secret-scan canary', pattern: /pf_test_canary_/ },
];

/** @param {string} text */
export function bundleProblems(text) {
  return FORBIDDEN_IN_BUNDLE.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
}
