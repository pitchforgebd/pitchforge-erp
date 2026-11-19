export const NAV_SECTIONS = [
  'approvals',
  'billing',
  'finance',
  'ledger',
  'partners',
  'projects',
  'crm',
  'hr',
  'procurement',
  'reports',
  'audit',
  'admin',
] as const;

export type NavSection = (typeof NAV_SECTIONS)[number];

export function isNavSection(value: string): value is NavSection {
  return (NAV_SECTIONS as readonly string[]).includes(value);
}

/**
 * Which sections to show. This only tidies the navigation: the permissions come from the
 * server, and the API still refuses anything the role may not do.
 */
export function visibleSections(permissions: readonly string[]): NavSection[] {
  return NAV_SECTIONS.filter((section) => permissions.includes(`${section}.read`));
}
