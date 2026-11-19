import { describe, expect, it } from 'vitest';

import {
  coverageProblems,
  coverageReport,
  parseFeatureList,
  readFeatureList,
} from '../scripts/feature-coverage-lib.ts';

describe('parseFeatureList', () => {
  it('reads feature rows and ignores everything else', () => {
    const features = parseFeatureList(
      [
        '# Feature list',
        '| Module | Features | Must |',
        '| ID | Feature | Priority |',
        '| --- | --- | --- |',
        '| CORE-01 | Company profile: legal name | M |',
        '| FIN-07  | Recurring journals          | S |',
      ].join('\n'),
    );
    expect(features).toEqual([
      { id: 'CORE-01', title: 'Company profile: legal name', priority: 'M', prefix: 'CORE' },
      { id: 'FIN-07', title: 'Recurring journals', priority: 'S', prefix: 'FIN' },
    ]);
  });

  it('finds all 260 features in the real list', () => {
    expect(readFeatureList()).toHaveLength(260);
  });
});

describe('coverageReport', () => {
  const features = parseFeatureList(
    ['| A-1 | One | M |', '| A-2 | Two | M |', '| A-3 | Three | S |', '| B-1 | Four | M |'].join(
      '\n',
    ),
  );

  it('flags a Must feature of a finished group with neither endpoint nor deferral', () => {
    const report = coverageReport(features, new Map([['A-1', ['x']]]), {}, ['A']);
    expect(report.uncovered.map((f) => f.id)).toEqual(['A-2']);
    expect(coverageProblems(report)).toEqual(['No endpoint or deferral for Must feature A-2: Two']);
  });

  it('accepts a deferral, ignores Should features and unfinished groups', () => {
    const report = coverageReport(features, new Map([['A-1', ['x']]]), { 'A-2': 'reason' }, ['A']);
    expect(coverageProblems(report)).toEqual([]);
    expect(report.rows.find((r) => r.prefix === 'A')).toEqual({
      prefix: 'A',
      done: true,
      must: 2,
      mustCovered: 1,
      mustDeferred: 1,
    });
    expect(report.rows.find((r) => r.prefix === 'B')?.done).toBe(false);
  });

  it('flags unknown feature IDs and stale deferrals', () => {
    const report = coverageReport(
      features,
      new Map([
        ['A-1', ['x']],
        ['Z-9', ['y']],
      ]),
      { 'A-1': 'has an endpoint now', 'Q-1': 'no such feature', 'A-2': 'fine' },
      ['A'],
    );
    expect(report.unknownFeatureIds).toEqual(['Z-9']);
    expect(report.staleDeferrals).toEqual(['A-1', 'Q-1']);
  });
});

describe('the real contracts', () => {
  it('cover every Must feature of the finished groups', () => {
    expect(coverageProblems(coverageReport(readFeatureList()))).toEqual([]);
  });
});
