import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button, EmptyState } from '@pitchforge/ui';

export default function NotFound(): ReactNode {
  const t = useTranslations('notFound');
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <EmptyState
        titleAs="h1"
        title={t('title')}
        action={
          <Button asChild variant="secondary">
            <Link href="/home">{t('home')}</Link>
          </Button>
        }
      />
    </main>
  );
}
