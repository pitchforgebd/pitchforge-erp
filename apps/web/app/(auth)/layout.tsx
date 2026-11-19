import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { readonly children: ReactNode }): ReactNode {
  const t = useTranslations('app');
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-center font-display text-xl font-bold text-accent">{t('brand')}</p>
        <p className="mb-6 text-center text-sm text-muted">{t('tagline')}</p>
        <div className="rounded-card border border-line bg-surface p-6 shadow-raised">
          {children}
        </div>
      </div>
    </main>
  );
}
