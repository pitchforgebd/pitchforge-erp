import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@pitchforge/ui';

export default function SessionExpiredPage(): ReactNode {
  const t = useTranslations('sessionExpired');
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>
      <Button asChild>
        <Link href="/login">{t('signIn')}</Link>
      </Button>
    </div>
  );
}
