export const SPEC_PATH = 'packages/contracts/openapi/openapi.v1.json';

function major(version: string): number {
  const value = Number.parseInt(version.split('.')[0] ?? '', 10);
  if (Number.isNaN(value)) throw new Error(`Not a version: "${version}"`);
  return value;
}

/** The newest contracts-v* tag from `git tag --sort=-v:refname` output, or null. */
export function latestContractTag(tagOutput: string): string | null {
  const tag = tagOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('contracts-v'));
  return tag ?? null;
}

/** Breaking changes are allowed only with a major version bump (api-design.md). */
export function breakingChangeAllowed(baseVersion: string, newVersion: string): boolean {
  return major(newVersion) > major(baseVersion);
}
