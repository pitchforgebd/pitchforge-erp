import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.join(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(path.join(ROOT, p), 'utf8');

interface Rule {
  type: string;
  parameters?: {
    required_status_checks?: { context: string }[];
    required_approving_review_count?: number;
    require_code_owner_review?: boolean;
    allowed_merge_methods?: string[];
  };
}

const ruleset = JSON.parse(read('.github/rulesets/main.json')) as {
  bypass_actors: unknown[];
  rules: Rule[];
};

/** Job display names from ci.yml (`name:` lines indented under a job id). */
function ciJobNames(): string[] {
  const yml = read('.github/workflows/ci.yml');
  const jobs = yml.slice(yml.indexOf('\njobs:'));
  return [...jobs.matchAll(/^ {2}[a-z][\w-]*:\n {4}name: ([\w-]+)$/gm)].map((m) => m[1] ?? '');
}

const rule = (type: string): Rule | undefined => ruleset.rules.find((r) => r.type === type);

describe('main branch ruleset', () => {
  it('requires exactly the CI jobs as status checks', () => {
    const required = (rule('required_status_checks')?.parameters?.required_status_checks ?? []).map(
      (c) => c.context,
    );
    expect(required.sort()).toEqual(ciJobNames().sort());
    expect(required.length).toBeGreaterThan(0);
  });

  it('blocks direct pushes, force-pushes and deletion, and requires signed commits', () => {
    for (const type of ['deletion', 'non_fast_forward', 'required_signatures', 'pull_request']) {
      expect(rule(type), type).toBeDefined();
    }
  });

  it('requires two approvals including a code owner, squash merge only, and has no bypass', () => {
    const pr = rule('pull_request')?.parameters;
    expect(pr?.required_approving_review_count).toBe(2);
    expect(pr?.require_code_owner_review).toBe(true);
    expect(pr?.allowed_merge_methods).toEqual(['squash']);
    expect(ruleset.bypass_actors).toEqual([]);
  });
});

describe('CI workflow hardening', () => {
  const yml = read('.github/workflows/ci.yml');

  it('pins every action to a full commit SHA', () => {
    const uses = [...yml.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1] ?? '');
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u, u).toMatch(/@[0-9a-f]{40}$/);
  });

  it('pins scanner images by digest', () => {
    const images = [...yml.matchAll(/_IMAGE:\s*(\S+)/g)].map((m) => m[1] ?? '');
    expect(images.length).toBeGreaterThan(0);
    for (const i of images) expect(i, i).toMatch(/@sha256:[0-9a-f]{64}$/);
  });

  it('uses a read-only token and does not persist checkout credentials', () => {
    expect(yml).toMatch(/^permissions:\n {2}contents: read$/m);
    const checkouts = yml.match(/uses: actions\/checkout@/g)?.length ?? 0;
    const noPersist = yml.match(/persist-credentials: false/g)?.length ?? 0;
    expect(noPersist).toBe(checkouts);
  });
});
