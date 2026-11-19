'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button, EmptyState } from '@pitchforge/ui';

/**
 * Shown when a page in the signed-in area fails. It says nothing about the cause: details stay
 * in the server log, under the request id.
 */
export default function AppError({ reset }: { readonly reset: () => void }): ReactNode {
  const t = useTranslations('appError');
  return (
    <div className="rounded-card border border-line bg-surface">
      <EmptyState
        titleAs="h1"
        title={t('title')}
        description={t('description')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>{t('retry')}</Button>
            <Button asChild variant="secondary">
              <Link href="/home">{t('home')}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
