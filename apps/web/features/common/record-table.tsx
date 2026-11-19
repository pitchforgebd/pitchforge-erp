'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button, DataTable, EmptyState } from '@pitchforge/ui';
import type { DataTableColumn } from '@pitchforge/ui';

import { Card } from './page-header.tsx';
import { ErrorState, LoadingState } from './states.tsx';

export interface RecordList<Row> {
  readonly items: readonly Row[];
  readonly status: 'loading' | 'error' | 'ready';
  readonly error: unknown;
  readonly refetch: () => void;
  readonly hasMore?: boolean;
  readonly loadingMore?: boolean;
  readonly loadMore?: () => void;
}

/** A list from `useList` in a card: states, "load more", and an optional toolbar. */
export function RecordTable<Row extends object>({
  label,
  list,
  columns,
  getRowId,
  empty,
  toolbar,
}: {
  readonly label: string;
  readonly list: RecordList<Row>;
  readonly columns: readonly DataTableColumn<Row>[];
  readonly getRowId: (row: Row) => string;
  readonly empty?: string;
  readonly toolbar?: ReactNode;
}): ReactNode {
  const common = useTranslations('common');
  return (
    <Card>
      {toolbar !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          {toolbar}
        </div>
      )}
      <DataTable
        label={label}
        rows={list.items}
        getRowId={getRowId}
        status={list.status}
        columns={columns}
        loadingState={<LoadingState />}
        errorState={<ErrorState error={list.error} onRetry={list.refetch} />}
        emptyState={<EmptyState title={empty ?? common('none')} />}
      />
      {list.hasMore === true && list.loadMore !== undefined && (
        <div className="border-t border-line p-3 text-center">
          <Button
            variant="secondary"
            size="sm"
            loading={list.loadingMore === true}
            onClick={list.loadMore}
          >
            {common('loadMore')}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** A label and value list for a record's details. */
export function Details({
  items,
}: {
  readonly items: readonly (readonly [label: string, value: ReactNode])[];
}): ReactNode {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
