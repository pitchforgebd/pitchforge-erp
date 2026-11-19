/**
 * Security headers (docs/04-security/headers-and-csp.md). The policy is strict in production:
 * no 'unsafe-inline', no 'unsafe-eval', and nothing loads from another origin. The development
 * server needs a few relaxations for hot reload, and they never reach a production build.
 */
export interface PolicyOptions {
  readonly nonce: string;
  readonly development: boolean;
}

export function contentSecurityPolicy({ nonce, development }: PolicyOptions): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    // A nonce makes browsers ignore 'unsafe-inline', and the dev overlay needs inline styles.
    development ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws://localhost:*' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join('; ');
}

export function securityHeaders(options: PolicyOptions): Readonly<Record<string, string>> {
  return {
    'content-security-policy': contentSecurityPolicy(options),
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'cross-origin-opener-policy': 'same-origin',
    ...(!options.development && {
      'strict-transport-security': 'max-age=63072000; includeSubDomains',
    }),
  };
}
