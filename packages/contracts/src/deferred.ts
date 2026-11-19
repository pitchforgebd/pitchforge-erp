/**
 * Feature-list groups whose contracts are finished. `pnpm contracts:coverage` requires every
 * Must feature of these groups to have an endpoint or an entry in DEFERRED_FEATURES.
 */
export const MODULE_GROUPS_DONE: readonly string[] = [
  'CORE',
  'CRM',
  'TND',
  'BIL',
  'FIN',
  'TAX',
  'PAR',
  'PRJ',
  'HR',
  'PAY',
  'PRC',
  'RPT',
  'UX',
];

/** Must features that need no endpoint of their own, and why. */
export const DEFERRED_FEATURES: Readonly<Record<string, string>> = {
  'CORE-22':
    'Sending and retrying is worker behaviour with no API. Users control it through notification preferences (CORE-27).',
  'CORE-41':
    'A UI pattern: the quick-add dialog calls the existing create endpoints of each module.',
  'CORE-43':
    'Operations tooling, deliberately not exposed through the API: a restore must not be reachable from the application layer (docs/06-operations/backup-and-recovery.md).',
  'UX-03': 'A quality of the web app, delivered by packages/ui and its responsive layouts.',
  'UX-06':
    'Formatting, delivered by Money in packages/shared-kernel and packages/ui. The API sends canonical decimal strings.',
  'UX-07':
    'Formatting, delivered by packages/shared-kernel and packages/ui. The API sends ISO dates and UTC timestamps.',
  'UX-11': 'A quality of the web app, enforced by the axe tests on every story and page.',
};
