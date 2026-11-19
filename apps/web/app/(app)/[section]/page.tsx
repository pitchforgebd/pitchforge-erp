import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import { EmptyState } from '@pitchforge/ui';

import { serverCall } from '../../../lib/api/server.ts';
import { isNavSection, visibleSections } from '../../../lib/navigation.ts';

/** A placeholder for each section until its screens are built in Phase 1. */
export default async function SectionPage({
  params,
}: {
  readonly params: Promise<{ section: string }>;
}): Promise<ReactNode> {
  const { section } = await params;
  if (!isNavSection(section)) notFound();

  const t = await getTranslations('section');
  const nav = await getTranslations('nav');
  const session = await serverCall(core.getSession, {});
  const allowed = visibleSections(session.permissions).includes(section);

  return (
    <div className="rounded-card border border-line bg-surface">
      <h1 className="sr-only">{nav(section)}</h1>
      {allowed ? (
        <EmptyState
          title={t('placeholderTitle', { section: nav(section) })}
          description={t('placeholderDescription')}
        />
      ) : (
        <EmptyState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />
      )}
    </div>
  );
}
