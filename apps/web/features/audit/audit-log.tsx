'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import type { AuditEntry } from '@pitchforge/contracts';
import { Button, DataTable, EmptyState, Field, Select, StatusPill, Tag } from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { ErrorState, LoadingState } from '../common/states.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';

const SCHEMAS = ['accounting', 'billing', 'core', 'hr', 'partners', 'payroll', 'projects'] as const;

const ACTION_TONE: Readonly<Record<AuditEntry['action'], Tone>> = {
  insert: 'good',
  update: 'info',
  delete: 'crit',
  login: 'neutral',
  export: 'warn',
  view_restricted: 'warn',
};

function ChainStatus(): ReactNode {
  const t = useTranslations('audit');
  const chain = useQuery({
    queryKey: [core.getAuditChainStatus.id],
    queryFn: () => browserCall(core.getAuditChainStatus, {}),
  });
  if (chain.data === undefined) return null;
  return (
    <span className="flex items-center gap-2 text-xs text-muted">
      {t('chain')}
      <StatusPill tone={chain.data.intact ? 'good' : 'crit'}>
        {chain.data.intact ? t('chainOk') : t('chainBroken')}
      </StatusPill>
    </span>
  );
}

export function AuditLogPage(): ReactNode {
  const t = useTranslations('audit');
  const actions = useTranslations('audit.actions');
  const tables = useTranslations('audit.tables');
  const common = useTranslations('common');
  const [tableName, setTableName] = useState('');
  const [userId, setUserId] = useState('');
  const users = useList(core.listUsers, {});
  const entries = useList(core.listAuditLog, {
    ...(tableName !== '' && { tableName }),
    ...(userId !== '' && { userId }),
  });

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={<ChainStatus />} />
      <div className="mb-4 grid max-w-2xl gap-3 sm:grid-cols-2">
        <Field label={t('table')}>
          {(control) => (
            <Select
              {...control}
              value={tableName}
              onChange={(event) => {
                setTableName(event.target.value);
              }}
              options={[
                { value: '', label: t('allTables') },
                ...SCHEMAS.map((schema) => ({ value: `${schema}.`, label: tables(schema) })),
              ]}
            />
          )}
        </Field>
        <Field label={t('user')}>
          {(control) => (
            <Select
              {...control}
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
              }}
              options={[
                { value: '', label: t('allUsers') },
                ...users.items.map((user) => ({ value: user.id, label: user.name })),
              ]}
            />
          )}
        </Field>
      </div>
      <Card>
        <DataTable
          label={t('title')}
          rows={entries.items}
          getRowId={(row) => row.id}
          status={entries.status}
          loadingState={<LoadingState />}
          errorState={<ErrorState error={entries.error} onRetry={entries.refetch} />}
          emptyState={<EmptyState title={t('emptyTitle')} />}
          columns={[
            { id: 'at', header: t('when'), cell: (row) => <TimeText value={row.at} /> },
            { id: 'user', header: t('user'), cell: (row) => row.user?.name ?? t('system') },
            {
              id: 'action',
              header: t('action'),
              cell: (row) => (
                <StatusPill tone={ACTION_TONE[row.action]}>{actions(row.action)}</StatusPill>
              ),
            },
            {
              id: 'record',
              header: t('record'),
              cell: (row) => (
                <span className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs text-muted">{row.tableName}</span>
                  {row.recordId !== null && <Tag>{row.recordId}</Tag>}
                </span>
              ),
            },
            {
              id: 'changes',
              header: t('changes'),
              cell: (row) =>
                row.changes.length === 0 ? (
                  t('noChanges')
                ) : (
                  <ul className="text-xs">
                    {row.changes.map((change) => (
                      <li key={change.field}>
                        <span className="font-medium">{change.field}</span>: {change.old ?? '—'} →{' '}
                        {change.new ?? '—'}
                      </li>
                    ))}
                  </ul>
                ),
            },
            {
              id: 'ip',
              header: t('ip'),
              cell: (row) => <span className="font-mono text-xs">{row.ipAddress ?? '—'}</span>,
            },
          ]}
        />
        {entries.hasMore && (
          <div className="border-t border-line p-3 text-center">
            <Button
              variant="secondary"
              size="sm"
              loading={entries.loadingMore}
              onClick={entries.loadMore}
            >
              {common('loadMore')}
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
