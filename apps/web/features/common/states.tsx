'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button, EmptyState } from '@pitchforge/ui';

import { errorCodeOf, useErrorMessage } from './errors.ts';

export function LoadingState({ label }: { readonly label?: string }): ReactNode {
  const t = useTranslations('states');
  return (
    <p role="status" className="px-4 py-10 text-center text-sm text-muted">
      {label ?? t('loading')}
    </p>
  );
}

/** A failed read: no permission gets its own message; anything else can be retried. */
export function ErrorState({
  error,
  onRetry,
}: {
  readonly error: unknown;
  readonly onRetry?: () => void;
}): ReactNode {
  const t = useTranslations('states');
  const common = useTranslations('common');
  const message = useErrorMessage();
  if (errorCodeOf(error) === 'FORBIDDEN') {
    return <EmptyState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />;
  }
  return (
    <EmptyState
      title={t('errorTitle')}
      description={message(error)}
      {...(onRetry !== undefined && {
        action: (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {common('retry')}
          </Button>
        ),
      })}
    />
  );
}

/** Any query: pending, failed or empty states, then the content. */
export function QueryView<T>({
  query,
  isEmpty,
  empty,
  children,
}: {
  readonly query: {
    readonly isPending: boolean;
    readonly isError: boolean;
    readonly error: unknown;
    readonly data: T | undefined;
    readonly refetch: () => unknown;
  };
  readonly isEmpty?: (data: T) => boolean;
  readonly empty?: { readonly title: string; readonly description?: string };
  readonly children: (data: T) => ReactNode;
}): ReactNode {
  if (query.isPending) return <LoadingState />;
  if (query.isError || query.data === undefined) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  if (isEmpty?.(query.data) === true && empty !== undefined) {
    return (
      <EmptyState
        title={empty.title}
        {...(empty.description !== undefined && { description: empty.description })}
      />
    );
  }
  return children(query.data);
}

/** The page needs a permission this user does not have. The API refuses its data too. */
export function ForbiddenState(): ReactNode {
  const t = useTranslations('states');
  return (
    <div className="rounded-card border border-line bg-surface">
      <EmptyState
        titleAs="h1"
        title={t('forbiddenTitle')}
        description={t('forbiddenDescription')}
      />
    </div>
  );
}
