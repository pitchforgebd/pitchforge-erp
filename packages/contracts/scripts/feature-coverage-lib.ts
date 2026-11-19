import { readFileSync } from 'node:fs';
import path from 'node:path';

import { DEFERRED_FEATURES, MODULE_GROUPS_DONE } from '../src/deferred.ts';
import { featureMap } from '../src/registry.ts';

export interface Feature {
  readonly id: string;
  readonly title: string;
  readonly priority: 'M' | 'S' | 'C';
  /** CORE, FIN, PAR … */
  readonly prefix: string;
}

const FEATURE_ROW = /^\|\s*([A-Z]+)-([0-9]+)\s*\|\s*(.+?)\s*\|\s*([MSC])\s*\|\s*$/;

/** Parse docs/01-requirements/feature-list.md. */
export function parseFeatureList(markdown: string): Feature[] {
  const features: Feature[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = FEATURE_ROW.exec(line);
    if (match === null) continue;
    const [, prefix = '', number = '', title = '', priority = 'C'] = match;
    features.push({
      id: `${prefix}-${number}`,
      title,
      priority: priority as Feature['priority'],
      prefix,
    });
  }
  return features;
}

export function readFeatureList(): Feature[] {
  const file = path.join(
    import.meta.dirname,
    '..',
    '..',
    '..',
    'docs',
    '01-requirements',
    'feature-list.md',
  );
  return parseFeatureList(readFileSync(file, 'utf8'));
}

export interface PrefixRow {
  readonly prefix: string;
  readonly done: boolean;
  readonly must: number;
  readonly mustCovered: number;
  readonly mustDeferred: number;
}

export interface CoverageReport {
  readonly rows: readonly PrefixRow[];
  /** Must features in a finished module group with neither an endpoint nor a deferral. */
  readonly uncovered: readonly Feature[];
  /** Endpoints that name a feature ID that does not exist. */
  readonly unknownFeatureIds: readonly string[];
  /** Deferrals for features that now have an endpoint, or that do not exist. */
  readonly staleDeferrals: readonly string[];
}

export function coverageReport(
  features: readonly Feature[],
  covered: ReadonlyMap<string, readonly string[]> = featureMap(),
  deferred: Readonly<Record<string, string>> = DEFERRED_FEATURES,
  doneGroups: readonly string[] = MODULE_GROUPS_DONE,
): CoverageReport {
  const known = new Set(features.map((f) => f.id));
  const isDeferred = (id: string) => Object.hasOwn(deferred, id);

  const prefixes = [...new Set(features.map((f) => f.prefix))];
  const rows = prefixes.map((prefix): PrefixRow => {
    const must = features.filter((f) => f.prefix === prefix && f.priority === 'M');
    return {
      prefix,
      done: doneGroups.includes(prefix),
      must: must.length,
      mustCovered: must.filter((f) => covered.has(f.id)).length,
      mustDeferred: must.filter((f) => !covered.has(f.id) && isDeferred(f.id)).length,
    };
  });

  return {
    rows,
    uncovered: features.filter(
      (f) =>
        f.priority === 'M' &&
        doneGroups.includes(f.prefix) &&
        !covered.has(f.id) &&
        !isDeferred(f.id),
    ),
    unknownFeatureIds: [...covered.keys()].filter((id) => !known.has(id)).sort(),
    staleDeferrals: Object.keys(deferred)
      .filter((id) => covered.has(id) || !known.has(id))
      .sort(),
  };
}

/** Problems that fail the check; empty when coverage is complete. */
export function coverageProblems(report: CoverageReport): string[] {
  return [
    ...report.uncovered.map((f) => `No endpoint or deferral for Must feature ${f.id}: ${f.title}`),
    ...report.unknownFeatureIds.map((id) => `Endpoint names an unknown feature: ${id}`),
    ...report.staleDeferrals.map((id) => `Stale deferral (has an endpoint, or unknown): ${id}`),
  ];
}
