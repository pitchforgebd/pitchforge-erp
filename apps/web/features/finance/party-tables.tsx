'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { AgeingReport, PartyStatement } from '@pitchforge/contracts';
import { DataTable, DateText, Money, Tag } from '@pitchforge/ui';

/** Ageing buckets and totals exactly as the server sent them. */
export function AgeingTable({
  report,
  partyLabel,
  onParty,
}: {
  readonly report: AgeingReport;
  readonly partyLabel: string;
  /** Opens a party's statement, when the screen offers one. */
  readonly onParty?: (partyId: string, partyName: string) => void;
}): ReactNode {
  const t = useTranslations('finance');
  const rows = [...report.rows, { ...report.totals, partyId: 'total', partyName: t('total') }];
  return (
    <DataTable
      label={partyLabel}
      rows={rows}
      getRowId={(row) => row.partyId}
      loadingState={null}
      errorState={null}
      emptyState={null}
      columns={[
        {
          id: 'party',
          header: partyLabel,
          cell: (row) => {
            if (row.partyId === 'total') return <strong>{row.partyName}</strong>;
            if (onParty === undefined) return row.partyName;
            return (
              <button
                type="button"
                className="text-left text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  onParty(row.partyId, row.partyName);
                }}
              >
                {row.partyName}
              </button>
            );
          },
        },
        {
          id: 'notDue',
          header: t('notDue'),
          align: 'right',
          cell: (row) => <Money value={row.notDue} />,
        },
        {
          id: 'd30',
          header: t('days1To30'),
          align: 'right',
          cell: (row) => <Money value={row.days1To30} />,
        },
        {
          id: 'd60',
          header: t('days31To60'),
          align: 'right',
          cell: (row) => <Money value={row.days31To60} />,
        },
        {
          id: 'd90',
          header: t('days61To90'),
          align: 'right',
          cell: (row) => <Money value={row.days61To90} />,
        },
        {
          id: 'over',
          header: t('over90'),
          align: 'right',
          cell: (row) => <Money value={row.over90} />,
        },
        {
          id: 'total',
          header: t('total'),
          align: 'right',
          cell: (row) => <Money value={row.total} />,
        },
      ]}
    />
  );
}

/** A running statement; opening, balances and closing come from the server. */
export function StatementTable({ statement }: { readonly statement: PartyStatement }): ReactNode {
  const t = useTranslations('finance');
  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <DateText value={statement.from} /> – <DateText value={statement.to} /> · {t('opening')}{' '}
        <Money value={statement.opening} />
      </p>
      <DataTable
        label={statement.partyName}
        rows={statement.lines}
        getRowId={(row) => `${row.reference}-${row.date}`}
        loadingState={null}
        errorState={null}
        emptyState={null}
        columns={[
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
          { id: 'ref', header: t('reference'), cell: (row) => <Tag>{row.reference}</Tag> },
          { id: 'description', header: t('description'), cell: (row) => row.description },
          {
            id: 'debit',
            header: t('debit'),
            align: 'right',
            cell: (row) => <Money value={row.debit} />,
          },
          {
            id: 'credit',
            header: t('credit'),
            align: 'right',
            cell: (row) => <Money value={row.credit} />,
          },
          {
            id: 'balance',
            header: t('balance'),
            align: 'right',
            cell: (row) => <Money value={row.balance} />,
          },
        ]}
      />
      <p className="text-right text-sm font-semibold">
        {t('closing')} <Money value={statement.closing} />
      </p>
    </div>
  );
}
