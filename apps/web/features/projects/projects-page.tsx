'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { projectsEndpoints as projects } from '@pitchforge/contracts';
import type { Timesheet } from '@pitchforge/contracts';
import {
  Button,
  Callout,
  DataTable,
  DateText,
  Dialog,
  EmptyState,
  Money,
  StatusPill,
  Tabs,
  Tag,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { useSession } from '../common/session.tsx';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';

import { EditTimesheetButton, NewProjectButton, NewTimesheetButton } from './forms.tsx';
import { MilestoneStatusPill, TaskStatusPill } from './status.tsx';

function ProjectList(): ReactNode {
  const t = useTranslations('projects');
  const types = useTranslations('projects.types');
  const list = useList(projects.listProjects, {});
  // Only partners open projects.
  const session = useSession();
  return (
    <RecordTable
      label={t('projects')}
      list={list}
      getRowId={(row) => row.id}
      empty={t('noProjects')}
      {...(session.permissions.includes('projects.create') && {
        toolbar: (
          <div className="flex justify-end">
            <NewProjectButton />
          </div>
        ),
      })}
      columns={[
        {
          id: 'project',
          header: t('project'),
          cell: (row) => (
            <Link href={`/projects/${row.id}`} className="flex flex-col hover:underline">
              <span className="font-medium">
                <Tag>{row.code}</Tag> {row.name}
              </span>
            </Link>
          ),
        },
        { id: 'type', header: t('type'), cell: (row) => types(row.type) },
        { id: 'manager', header: t('manager'), cell: (row) => row.manager.name },
        { id: 'start', header: t('started'), cell: (row) => <DateText value={row.startDate} /> },
        {
          id: 'value',
          header: t('contractValue'),
          align: 'right',
          cell: (row) => <Money value={row.value} />,
        },
      ]}
    />
  );
}

function MyWork(): ReactNode {
  const t = useTranslations('projects');
  const work = useQuery({
    queryKey: [projects.getMyWork.id],
    queryFn: () => browserCall(projects.getMyWork, {}),
  });
  return (
    <QueryView query={work}>
      {(data) => (
        <div className="flex flex-col gap-4">
          {data.timesheetDue && <Callout tone="warn" title={t('timesheetDue')} />}
          <Card title={t('myTasks')}>
            {data.tasks.length === 0 ? (
              <EmptyState title={t('noTasks')} />
            ) : (
              <ul>
                {data.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-b-0"
                  >
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {task.dueDate !== null && <DateText value={task.dueDate} />}
                      <TaskStatusPill status={task.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={t('milestonesDue')}>
            {data.milestonesDueSoon.length === 0 ? (
              <EmptyState title={t('noMilestones')} />
            ) : (
              <ul>
                {data.milestonesDueSoon.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-b-0"
                  >
                    <Link
                      href={`/projects/${milestone.projectId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {milestone.name}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <DateText value={milestone.dueDate} />
                      <MilestoneStatusPill status={milestone.status} overdue={milestone.overdue} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </QueryView>
  );
}

const SHEET_TONE: Readonly<Record<Timesheet['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  approved: 'good',
  rejected: 'crit',
  locked: 'good',
};

function TimesheetDialog({
  sheet,
  onClose,
}: {
  readonly sheet: Timesheet;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('projects');
  const common = useTranslations('common');
  const status = useTranslations('projects.sheetStatus');
  const message = useErrorMessage();
  const list = useList(projects.listProjects, {});
  const codeOf = new Map(list.items.map((project) => [project.id, project.code]));
  const submit = useCommand(
    () =>
      browserCall(projects.submitTimesheet, {
        params: { id: sheet.id },
        ifMatch: `"${String(sheet.meta.version)}"`,
      }),
    { success: t('sheetSubmitted'), invalidate: [projects.listTimesheets.id], onSuccess: onClose },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('weekOf', { name: sheet.employee.name })}
      closeLabel={common('close')}
      footer={
        <>
          <EditTimesheetButton sheet={sheet} />
          {sheet.allowedActions.includes('submit') && (
            <Button
              loading={submit.isPending}
              onClick={() => {
                submit.mutate(undefined);
              }}
            >
              {t('submitForApproval')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {submit.isError && <Callout tone="crit" title={message(submit.error)} />}
        <Details
          items={[
            [t('week'), <DateText key="w" value={sheet.weekStart} />],

            [
              t('status'),
              <StatusPill key="s" tone={SHEET_TONE[sheet.status]}>
                {status(sheet.status)}
              </StatusPill>,
            ],
            [t('totalHours'), sheet.totalHours],
          ]}
        />
        <DataTable
          label={t('entries')}
          rows={sheet.entries}
          getRowId={(row) => `${row.projectId}-${row.date}`}
          loadingState={null}
          errorState={null}
          emptyState={null}
          columns={[
            { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
            {
              id: 'project',
              header: t('project'),
              cell: (row) => <Tag>{codeOf.get(row.projectId) ?? '…'}</Tag>,
            },
            { id: 'note', header: t('note'), cell: (row) => row.note ?? '—' },
            { id: 'hours', header: t('hours'), align: 'right', cell: (row) => row.hours },
          ]}
        />
        <p className="text-xs text-muted">{t('sheetNote')}</p>
      </div>
    </Dialog>
  );
}

function Timesheets(): ReactNode {
  const t = useTranslations('projects');
  const status = useTranslations('projects.sheetStatus');
  const sheets = useList(projects.listTimesheets, {});
  const [open, setOpen] = useState<Timesheet | null>(null);
  return (
    <>
      <RecordTable
        label={t('timesheets')}
        list={sheets}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{t('timesheetsHint')}</p>
            <NewTimesheetButton />
          </div>
        }
        columns={[
          {
            id: 'employee',
            header: t('employee'),
            cell: (row) => (
              <button
                type="button"
                className="text-left text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.employee.name}
              </button>
            ),
          },
          { id: 'week', header: t('week'), cell: (row) => <DateText value={row.weekStart} /> },
          { id: 'hours', header: t('totalHours'), align: 'right', cell: (row) => row.totalHours },
          {
            id: 'status',
            header: t('status'),

            cell: (row) => (
              <StatusPill tone={SHEET_TONE[row.status]}>{status(row.status)}</StatusPill>
            ),
          },
        ]}
      />
      {open !== null && (
        <TimesheetDialog
          sheet={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

export function ProjectsPage(): ReactNode {
  const t = useTranslations('projects');
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('title')}
        items={[
          { value: 'projects', label: t('projects'), content: <ProjectList /> },
          { value: 'mine', label: t('myWork'), content: <MyWork /> },
          { value: 'timesheets', label: t('timesheets'), content: <Timesheets /> },
        ]}
      />
    </>
  );
}
