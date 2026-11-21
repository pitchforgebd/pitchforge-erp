'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { coreEndpoints as core, reportingEndpoints as reporting } from '@pitchforge/contracts';
import type { DashboardKind, DashboardTile } from '@pitchforge/contracts';
import { Button, EmptyState, KpiTile, Money } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { ApprovalRow, ReviewDialog } from '../approvals/approvals.tsx';
import { Card, PageHeader } from '../common/page-header.tsx';
import { useSession } from '../common/session.tsx';
import { ErrorState, LoadingState, QueryView } from '../common/states.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';

/**
 * Which home dashboard to open. Permissions only choose the view; the API decides whether
 * this user may read it, and refuses otherwise.
 */
export function homeDashboardOf(
  permissions: readonly string[],
): Exclude<DashboardKind, 'sales' | 'hr'> {
  const order = ['partner', 'finance', 'pm'] as const;
  return order.find((kind) => permissions.includes(`dashboard.${kind}`)) ?? 'employee';
}

function Tile({ tile }: { readonly tile: DashboardTile }): ReactNode {
  const value = tile.money !== null ? <Money value={tile.money} /> : (tile.count ?? '—');
  const content = (
    <KpiTile label={tile.label} value={value} {...(tile.hint !== null && { hint: tile.hint })} />
  );
  if (tile.link === null) return content;
  return (
    <Link
      href={tile.link}
      className="block rounded-card focus-visible:outline-2 focus-visible:outline-accent"
    >
      {content}
    </Link>
  );
}

function Waiting({ onOpen }: { readonly onOpen: (id: string) => void }): ReactNode {
  const t = useTranslations('home');
  const waiting = useList(core.listApprovals, { assignedToMe: 'true' });
  let body: ReactNode;
  if (waiting.status === 'loading') body = <LoadingState />;
  else if (waiting.status === 'error')
    body = <ErrorState error={waiting.error} onRetry={waiting.refetch} />;
  else if (waiting.items.length === 0) body = <EmptyState title={t('nothingWaiting')} />;
  else {
    body = (
      <ul>
        {waiting.items.slice(0, 5).map((approval) => (
          <ApprovalRow key={approval.id} approval={approval} onOpen={onOpen} />
        ))}
      </ul>
    );
  }
  return (
    <Card
      title={t('waiting')}
      actions={
        <Button asChild variant="secondary" size="sm">
          <Link href="/approvals">{t('openApprovals')}</Link>
        </Button>
      }
    >
      {body}
    </Card>
  );
}

function Attention(): ReactNode {
  const t = useTranslations('home');
  const notifications = useQuery({
    queryKey: [core.listNotifications.id],
    queryFn: () => browserCall(core.listNotifications, { query: {} }),
  });
  return (
    <Card title={t('attention')}>
      <QueryView
        query={notifications}
        isEmpty={(data) => data.items.length === 0}
        empty={{ title: t('allClear') }}
      >
        {(data) => (
          <ul>
            {data.items.map((item) => {
              const body = (
                <>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="block text-xs text-muted">{item.body}</span>
                </>
              );
              return (
                <li key={item.id} className="border-b border-line last:border-b-0">
                  {item.link === null ? (
                    <div className="px-4 py-3">{body}</div>
                  ) : (
                    <Link href={item.link} className="block px-4 py-3 hover:bg-surface-2">
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </QueryView>
    </Card>
  );
}

export function HomePage(): ReactNode {
  const t = useTranslations('home');
  const session = useSession();
  const kind = homeDashboardOf(session.permissions);
  const firstName = session.name.split(' ')[0] ?? session.name;
  const [open, setOpen] = useState<string | null>(null);
  const dashboard = useQuery({
    queryKey: [reporting.getDashboard.id, kind],
    queryFn: () => browserCall(reporting.getDashboard, { params: { kind } }),
  });

  return (
    <>
      <PageHeader
        title={t(`${kind}Title`, { name: firstName })}
        description={t(`${kind}Description`)}
      />
      <QueryView query={dashboard}>
        {(data) => (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.tiles.map((tile) => (
                <Tile key={tile.key} tile={tile} />
              ))}
            </div>
            <p className="mb-4 text-xs text-muted">
              {t.rich('generatedAt', { time: () => <TimeText value={data.generatedAt} /> })}
            </p>
          </>
        )}
      </QueryView>
      <div className="grid gap-4 xl:grid-cols-2">
        <Waiting onOpen={setOpen} />
        <Attention />
      </div>
      <ReviewDialog
        id={open}
        onClose={() => {
          setOpen(null);
        }}
      />
    </>
  );
}
