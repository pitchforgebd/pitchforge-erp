'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import { DateText, Money, StatusPill, Tabs, Tag } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { RecordTable } from '../common/record-table.tsx';
import { QueryView } from '../common/states.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';

function Users(): ReactNode {
  const t = useTranslations('admin');
  const status = useTranslations('admin.userStatus');
  const users = useList(core.listUsers, {});
  const roles = useList(core.listRoles, {});
  const roleName = new Map(roles.items.map((role) => [role.id, role.name]));
  return (
    <RecordTable
      label={t('users')}
      list={users}
      getRowId={(row) => row.id}
      columns={[
        {
          id: 'name',
          header: t('name'),
          cell: (row) => (
            <span className="flex flex-col">
              <span className="font-medium">{row.name}</span>
              <span className="text-xs text-muted">{row.email}</span>
            </span>
          ),
        },
        {
          id: 'roles',
          header: t('role'),
          cell: (row) => (
            <span className="flex flex-wrap gap-1">
              {row.roleIds.map((id) => (
                <Tag key={id}>{roleName.get(id) ?? '…'}</Tag>
              ))}
              {row.accessExpiresAt !== null && (
                <span className="text-xs text-muted">
                  {t('accessUntil', { date: row.accessExpiresAt.slice(0, 10) })}
                </span>
              )}
            </span>
          ),
        },
        {
          id: 'status',
          header: t('status'),
          cell: (row) => (
            <StatusPill
              tone={
                row.status === 'active' ? 'good' : row.status === 'invited' ? 'info' : 'neutral'
              }
            >
              {status(row.status)}
            </StatusPill>
          ),
        },
        {
          id: 'twoFactor',
          header: t('twoFactor'),
          cell: (row) => (
            <StatusPill tone={row.twoFactorEnabled ? 'good' : 'warn'}>
              {row.twoFactorEnabled ? t('active') : t('inactive')}
            </StatusPill>
          ),
        },
        {
          id: 'lastLogin',
          header: t('lastLogin'),
          cell: (row) =>
            row.lastLoginAt === null ? t('never') : <TimeText value={row.lastLoginAt} />,
        },
      ]}
    />
  );
}

function Roles(): ReactNode {
  const t = useTranslations('admin');
  const kinds = useTranslations('admin.kinds');
  const roles = useList(core.listRoles, {});
  return (
    <RecordTable
      label={t('roles')}
      list={roles}
      getRowId={(row) => row.id}
      columns={[
        {
          id: 'name',
          header: t('name'),
          cell: (row) => (
            <span className="flex flex-col">
              <span className="font-medium">{row.name}</span>
              {row.description !== null && (
                <span className="text-xs text-muted">{row.description}</span>
              )}
            </span>
          ),
        },
        {
          id: 'type',
          header: t('type'),
          cell: (row) => (
            <StatusPill tone="neutral">{row.system ? t('system') : t('custom')}</StatusPill>
          ),
        },
        {
          id: 'grants',
          header: t('grants'),
          cell: (row) => (
            <ul className="text-xs">
              {row.grants.map((grant) => (
                <li key={grant.area}>
                  <span className="font-mono">{grant.area}</span>: {grant.actions.join(', ')} ·{' '}
                  {grant.scope}
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: 'restricted',
          header: t('restrictedFields'),
          cell: (row) =>
            row.restrictedFields.length === 0 ? (
              <span className="text-muted">{t('noRestricted')}</span>
            ) : (
              <span className="flex flex-wrap gap-1">
                {row.restrictedFields.map((kind) => (
                  <Tag key={kind}>{kinds(kind)}</Tag>
                ))}
              </span>
            ),
        },
      ]}
    />
  );
}

function Rules(): ReactNode {
  const t = useTranslations('admin');
  const modes = useTranslations('admin.modes');
  const rules = useList(core.listApprovalRules, {});
  const roles = useList(core.listRoles, {});
  const roleName = new Map(roles.items.map((role) => [role.id, role.name]));
  return (
    <RecordTable
      label={t('rules')}
      list={rules}
      getRowId={(row) => row.id}
      columns={[
        {
          id: 'name',
          header: t('name'),
          cell: (row) => (
            <span className="flex flex-col">
              <span className="font-medium">{row.name}</span>
              <span className="font-mono text-xs text-muted">{row.sourceType}</span>
            </span>
          ),
        },
        {
          id: 'threshold',
          header: t('threshold'),
          cell: (row) =>
            row.minAmount === null
              ? t('anyAmount')
              : t.rich('from', {
                  amount: () => (
                    <Money value={row.minAmount ?? { amount: '0.00', currency: 'BDT' }} />
                  ),
                }),
        },
        {
          id: 'approvers',
          header: t('approvers'),
          cell: (row) => (
            <span className="flex flex-wrap gap-1">
              {row.approverRoleIds.map((id) => (
                <Tag key={id}>{roleName.get(id) ?? '…'}</Tag>
              ))}
            </span>
          ),
        },
        { id: 'mode', header: t('mode'), cell: (row) => modes(row.mode) },
        {
          id: 'sla',
          header: t('sla'),
          cell: (row) => (row.slaHours === null ? '—' : t('slaHours', { hours: row.slaHours })),
        },
        {
          id: 'active',
          header: t('status'),
          cell: (row) => (
            <StatusPill tone={row.active ? 'good' : 'neutral'}>
              {row.active ? t('active') : t('inactive')}
            </StatusPill>
          ),
        },
      ]}
    />
  );
}

function CompanySettings(): ReactNode {
  const t = useTranslations('admin');
  const company = useQuery({
    queryKey: [core.getCompany.id],
    queryFn: () => browserCall(core.getCompany, {}),
  });
  return (
    <Card>
      <QueryView query={company}>
        {(data) => (
          <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-[max-content_1fr]">
            <dt className="text-muted">{t('legalName')}</dt>
            <dd>{data.legalName}</dd>
            <dt className="text-muted">{t('tin')}</dt>
            <dd className="font-mono">{data.tin}</dd>
            <dt className="text-muted">{t('bin')}</dt>
            <dd className="font-mono">{data.bin}</dd>
            <dt className="text-muted">{t('licence')}</dt>
            <dd className="font-mono">{data.licenceNo ?? '—'}</dd>
            <dt className="text-muted">{t('currency')}</dt>
            <dd>{data.baseCurrency}</dd>
            <dt className="text-muted">{t('fiscalYear')}</dt>
            <dd>
              {data.fiscalYearStartMonth === 7 ? t('july') : String(data.fiscalYearStartMonth)}
            </dd>
          </dl>
        )}
      </QueryView>
    </Card>
  );
}

function OrgUnits(): ReactNode {
  const t = useTranslations('admin');
  const types = useTranslations('admin.unitTypes');
  const units = useList(core.listOrgUnits, {});
  return (
    <RecordTable
      label={t('orgUnits')}
      list={units}
      getRowId={(row) => row.id}
      columns={[
        { id: 'code', header: t('code'), cell: (row) => <Tag>{row.code}</Tag> },
        { id: 'name', header: t('name'), cell: (row) => row.name },
        { id: 'type', header: t('type'), cell: (row) => types(row.type) },
      ]}
    />
  );
}

function Holidays(): ReactNode {
  const t = useTranslations('admin');
  const holidays = useList(core.listHolidays, {});
  return (
    <RecordTable
      label={t('holidays')}
      list={holidays}
      getRowId={(row) => row.id}
      columns={[
        { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
        { id: 'name', header: t('name'), cell: (row) => row.name },
      ]}
    />
  );
}

function Numbering(): ReactNode {
  const t = useTranslations('admin');
  const series = useList(core.listNumberSeries, {});
  return (
    <RecordTable
      label={t('numbering')}
      list={series}
      getRowId={(row) => row.id}
      columns={[
        { id: 'type', header: t('documentType'), cell: (row) => row.documentType },
        {
          id: 'prefix',
          header: t('prefix'),
          cell: (row) => <Tag>{`${row.prefix}-${row.fiscalYearCode}`}</Tag>,
        },
        {
          id: 'last',
          header: t('lastIssued'),
          align: 'right',
          cell: (row) => <span className="tabular-nums">{row.lastIssued}</span>,
        },
        {
          id: 'gapFree',
          header: t('gapFree'),
          cell: (row) => (
            <StatusPill tone={row.gapFree ? 'good' : 'neutral'}>
              {row.gapFree ? t('active') : t('inactive')}
            </StatusPill>
          ),
        },
      ]}
    />
  );
}

function Reminders(): ReactNode {
  const t = useTranslations('admin');
  const rules = useList(core.listReminderRules, {});
  return (
    <RecordTable
      label={t('reminders')}
      list={rules}
      getRowId={(row) => row.id}
      columns={[
        { id: 'subject', header: t('subject'), cell: (row) => row.subject },
        { id: 'days', header: t('daysBefore'), cell: (row) => row.daysBefore.join(', ') },
        {
          id: 'active',
          header: t('status'),
          cell: (row) => (
            <StatusPill tone={row.active ? 'good' : 'neutral'}>
              {row.active ? t('active') : t('inactive')}
            </StatusPill>
          ),
        },
      ]}
    />
  );
}

export function AdminPage(): ReactNode {
  const t = useTranslations('admin');
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('title')}
        items={[
          { value: 'users', label: t('users'), content: <Users /> },
          { value: 'roles', label: t('roles'), content: <Roles /> },
          { value: 'rules', label: t('rules'), content: <Rules /> },
          { value: 'company', label: t('company'), content: <CompanySettings /> },
          { value: 'units', label: t('orgUnits'), content: <OrgUnits /> },
          { value: 'holidays', label: t('holidays'), content: <Holidays /> },
          { value: 'numbering', label: t('numbering'), content: <Numbering /> },
          { value: 'reminders', label: t('reminders'), content: <Reminders /> },
        ]}
      />
    </>
  );
}
