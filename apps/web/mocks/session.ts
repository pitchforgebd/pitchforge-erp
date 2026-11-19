/** Cookie names the mock sets, matching the real API's (docs/04-security/cookie-policy.md). */
export const SESSION_COOKIE = '__Host-pf_session';
export const PARTIAL_COOKIE = '__Host-pf_partial';

/** Set by a step-up; a sensitive command needs it (security architecture §1). */
export const STEP_UP_COOKIE = '__Host-pf_stepup';
