// @ts-check
/** Conventional Commits check, shared by the commit-msg hook and its tests. */

export const TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
  'contract',
];

// Keep in sync with TYPES (a literal regex, not one built at runtime; see the test).
const HEADER =
  // eslint-disable-next-line security/detect-unsafe-regex -- linear pattern; input is capped at MAX_HEADER (100) chars before it runs
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|contract)(\([a-z0-9][a-z0-9/-]*\))?!?: \S.*$/;
const MAX_HEADER = 100;

/**
 * @param {string} message full commit message
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkCommitMessage(message) {
  const header = (message.split(/\r?\n/).find((l) => !l.startsWith('#')) ?? '').trim();

  // Messages git or GitHub generate themselves.
  if (/^(Merge |Revert "|fixup! |squash! |amend! )/.test(header)) return { ok: true };

  if (header.length === 0) return { ok: false, reason: 'Commit message is empty.' };
  if (header.length > MAX_HEADER) {
    return {
      ok: false,
      reason: `First line is ${header.length} characters; keep it to ${MAX_HEADER}.`,
    };
  }
  if (!HEADER.test(header)) {
    return { ok: false, reason: `"${header}" is not a Conventional Commit header.` };
  }
  return { ok: true };
}
