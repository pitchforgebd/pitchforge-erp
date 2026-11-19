import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import { EmptyState } from '@pitchforge/ui';

import { serverCall } from '../../../lib/api/server.ts';

export default async function HomePage(): Promise<ReactNode> {
  const t = await getTranslations('home');
  const session = await serverCall(core.getSession, {});
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('greeting', { name: session.name })}</h1>
      <div className="rounded-card border border-line bg-surface">
        <EmptyState title={t('placeholderTitle')} description={t('placeholderDescription')} />
      </div>
    </div>
  );
}
