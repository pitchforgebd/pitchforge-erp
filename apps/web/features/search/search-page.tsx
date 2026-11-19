'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { SyntheticEvent, ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import { Button, EmptyState, Input, Tag } from '@pitchforge/ui';

import { Card, PageHeader } from '../common/page-header.tsx';
import { ErrorState, LoadingState } from '../common/states.tsx';
import { useList } from '../common/use-list.ts';

function Results({ query }: { readonly query: string }): ReactNode {
  const t = useTranslations('search');
  const common = useTranslations('common');
  const results = useList(core.search, { q: query });

  if (results.status === 'loading') return <LoadingState />;
  if (results.status === 'error')
    return <ErrorState error={results.error} onRetry={results.refetch} />;
  if (results.items.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }
  return (
    <>
      <p className="border-b border-line px-4 py-2 text-xs text-muted" role="status">
        {t('results', { count: results.items.length })}
      </p>
      <ul>
        {results.items.map((item) => (
          <li
            key={`${item.recordType}-${item.recordId}`}
            className="border-b border-line last:border-b-0"
          >
            <Link href={item.link} className="flex flex-col gap-0.5 px-4 py-3 hover:bg-surface-2">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {item.title}
                <Tag>{item.recordType.replaceAll('_', ' ')}</Tag>
              </span>
              {item.subtitle !== null && (
                <span className="text-xs text-muted">{item.subtitle}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {results.hasMore && (
        <div className="p-3 text-center">
          <Button
            variant="secondary"
            size="sm"
            loading={results.loadingMore}
            onClick={results.loadMore}
          >
            {common('loadMore')}
          </Button>
        </div>
      )}
    </>
  );
}

export function SearchPage({ initialQuery }: { readonly initialQuery: string }): ReactNode {
  const t = useTranslations('search');
  const router = useRouter();
  const [text, setText] = useState(initialQuery);
  const query = initialQuery.trim();

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    router.replace(`/search?q=${encodeURIComponent(text.trim())}`);
  };

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <form role="search" onSubmit={submit} className="mb-4 flex max-w-xl gap-2">
        <Input
          type="search"
          aria-label={t('label')}
          placeholder={t('placeholder')}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <Button type="submit">{t('title')}</Button>
      </form>
      <Card>
        {query.length >= 2 ? <Results query={query} /> : <EmptyState title={t('hint')} />}
      </Card>
    </>
  );
}
