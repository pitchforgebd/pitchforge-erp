'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { projectsEndpoints as projects } from '@pitchforge/contracts';
import type { Milestone, Project, Task } from '@pitchforge/contracts';
import { addDays } from '@pitchforge/shared-kernel';
import type { BusinessDate } from '@pitchforge/shared-kernel';
import {
  Button,
  Callout,
  DataTable,
  DateInput,
  DateText,
  Dialog,
  EmptyState,
  Field,
  Input,
  KpiTile,
  Money,
  Select,
  StatusPill,
  Tabs,
  Textarea,
} from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { errorCodeOf, useErrorMessage } from '../common/errors.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { RecordTable } from '../common/record-table.tsx';
import { useCanRead } from '../common/session.tsx';
import { ErrorState, LoadingState, QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';

import {
  EditProjectButton,
  EditTeamButton,
  NewBudgetVersionButton,
  NewFeeAgreementButton,
  NewMilestoneButton,
  ProjectStatusButton,
  TaskCommentsButton,
} from './forms.tsx';
import { MilestoneStatusPill, TaskStatusPill } from './status.tsx';

/** Money on this project, if the role may see it; a 403 here is expected, not an error. */
function Overview({ projectId }: { readonly projectId: string }): ReactNode {
  const t = useTranslations('projects');
  const overview = useQuery({
    queryKey: [projects.getProjectOverview.id, projectId],
    queryFn: () => browserCall(projects.getProjectOverview, { params: { id: projectId } }),
    retry: false,
  });
  if (overview.isPending) return <LoadingState />;
  if (errorCodeOf(overview.error) === 'FORBIDDEN')
    return <Callout tone="info" title={t('moneyHidden')} />;
  if (overview.data === undefined) return <ErrorState error={overview.error} />;
  const data = overview.data;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiTile
        label={t('contractValue')}
        value={<Money value={data.project.value} />}
        hint={t('invoicedHint')}
      />
      <KpiTile
        label={t('costToDate')}
        value={<Money value={data.costToDate} />}
        hint={t('budgetUsed', { percent: data.budgetUsedPercent })}
      />
      <KpiTile label={t('margin')} value={`${data.marginPercent}%`} hint={t('onInvoiced')} />
      <KpiTile label={t('progress')} value={`${data.progressPercent}%`} hint={t('progressHint')} />
      {data.budgetAlert !== 'none' && (
        <div className="sm:col-span-2 xl:col-span-4">
          <Callout
            tone={data.budgetAlert === 'exceeded' ? 'crit' : 'warn'}
            title={t(`budgetAlert.${data.budgetAlert}`)}
          />
        </div>
      )}
    </div>
  );
}

function DeadlineDialog({
  milestone,
  onClose,
}: {
  readonly milestone: Milestone;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('projects');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [dueDate, setDueDate] = useState<BusinessDate | null>(
    addDays(milestone.dueDate as BusinessDate, 7),
  );
  const [reason, setReason] = useState('');
  const save = useCommand(
    () =>
      browserCall(projects.updateMilestone, {
        params: { id: milestone.id },
        body: { dueDate: dueDate ?? milestone.dueDate, dueDateChangeReason: reason.trim() },
        ifMatch: `"${String(milestone.meta.version)}"`,
      }),
    { success: t('deadlineMoved'), invalidate: [projects.listMilestones.id], onSuccess: onClose },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('changeDeadline')}
      description={milestone.name}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            loading={save.isPending}
            disabled={dueDate === null || reason.trim().length < 3}
            onClick={() => {
              save.mutate(undefined);
            }}
          >
            {t('moveDeadline')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {save.isError && <Callout tone="crit" title={message(save.error)} />}
        <p className="text-sm text-muted">
          {t('currentDeadline')} <DateText value={milestone.dueDate} />
        </p>
        <Field label={t('newDeadline')} required requiredLabel={common('required')}>
          {(control) => (
            <DateInput
              {...control}
              value={dueDate}
              placeholder={t('chooseDate')}
              onChange={(value) => {
                setDueDate(value as BusinessDate | null);
              }}
            />
          )}
        </Field>
        <Field
          label={t('deadlineReason')}
          hint={t('deadlineReasonHint')}
          required
          requiredLabel={common('required')}
        >
          {(control) => (
            <Textarea
              {...control}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function Milestones({
  projectId,
  project,
}: {
  readonly projectId: string;
  readonly project: Project;
}): ReactNode {
  const t = useTranslations('projects');
  const message = useErrorMessage();
  const milestones = useQuery({
    queryKey: [projects.listMilestones.id, projectId],
    queryFn: () => browserCall(projects.listMilestones, { params: { id: projectId }, query: {} }),
  });
  const [moving, setMoving] = useState<Milestone | null>(null);
  const signOff = useCommand(
    (milestone: Milestone) =>
      browserCall(projects.signOffMilestone, {
        params: { id: milestone.id },
        ifMatch: `"${String(milestone.meta.version)}"`,
      }),
    { success: t('signedOff'), invalidate: [projects.listMilestones.id] },
  );
  return (
    <Card
      title={t('milestones')}
      description={t('milestonesHint')}
      actions={<NewMilestoneButton project={project} />}
    >
      {signOff.isError && (
        <div className="p-3">
          <Callout tone="crit" title={message(signOff.error)} />
        </div>
      )}
      <QueryView
        query={milestones}
        isEmpty={(data) => data.items.length === 0}
        empty={{ title: t('noMilestones') }}
      >
        {(data) => (
          <ol>
            {data.items.map((milestone, index) => (
              <li
                key={milestone.id}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {index + 1}. {milestone.name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <DateText value={milestone.dueDate} /> ·{' '}
                    {t('weight', { percent: milestone.weightPercent })}
                    {milestone.billingAmount.amount !== '0.00' && (
                      <>
                        · {t('bills')} <Money value={milestone.billingAmount} />
                      </>
                    )}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <MilestoneStatusPill status={milestone.status} overdue={milestone.overdue} />
                  {milestone.allowedActions.includes('update') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={t('changeDeadlineOf', { name: milestone.name })}
                      onClick={() => {
                        setMoving(milestone);
                      }}
                    >
                      {t('changeDeadline')}
                    </Button>
                  )}
                  {milestone.allowedActions.includes('sign_off') && (
                    <Button
                      size="sm"
                      loading={signOff.isPending}
                      onClick={() => {
                        signOff.mutate(milestone);
                      }}
                    >
                      {t('recordSignOff')}
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </QueryView>
      {moving !== null && (
        <DeadlineDialog
          milestone={moving}
          onClose={() => {
            setMoving(null);
          }}
        />
      )}
    </Card>
  );
}

const COLUMNS: readonly Task['status'][] = ['todo', 'in_progress', 'review', 'done'];

function NewTaskDialog({
  projectId,
  onClose,
}: {
  readonly projectId: string;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('projects');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const team = useQuery({
    queryKey: [projects.getProjectTeam.id, projectId],
    queryFn: () => browserCall(projects.getProjectTeam, { params: { id: projectId } }),
  });
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const create = useCommand(
    () =>
      browserCall(projects.createTask, {
        params: { id: projectId },
        body: {
          milestoneId: null,
          parentTaskId: null,
          title: title.trim(),
          description: null,
          assigneeIds: assignee === '' ? [] : [assignee],
          dueDate: null,
        },
      }),
    { success: t('taskAdded'), invalidate: [projects.listTasks.id], onSuccess: onClose },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('addTask')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            loading={create.isPending}
            disabled={title.trim().length < 2}
            onClick={() => {
              create.mutate(undefined);
            }}
          >
            {t('addTask')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {create.isError && <Callout tone="crit" title={message(create.error)} />}
        <Field label={t('taskTitle')} required requiredLabel={common('required')}>
          {(control) => (
            <Input
              {...control}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
            />
          )}
        </Field>
        <Field label={t('assignee')}>
          {(control) => (
            <Select
              {...control}
              value={assignee}
              placeholder={t('nobody')}
              options={(team.data?.items ?? []).map((member) => ({
                value: member.user.id,
                label: member.user.name,
              }))}
              onChange={(event) => {
                setAssignee(event.target.value);
              }}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function TaskBoard({ projectId }: { readonly projectId: string }): ReactNode {
  const t = useTranslations('projects');
  const statuses = useTranslations('projects.taskStatus');
  const message = useErrorMessage();
  const [adding, setAdding] = useState(false);
  const tasks = useQuery({
    queryKey: [projects.listTasks.id, projectId],
    queryFn: () => browserCall(projects.listTasks, { params: { id: projectId }, query: {} }),
  });
  const move = useCommand(
    ({ task, status }: { task: Task; status: Task['status'] }) =>
      browserCall(projects.updateTask, {
        params: { id: task.id },
        body: { status },
        ifMatch: `"${String(task.meta.version)}"`,
      }),
    {
      success: (task) => t('taskMoved', { status: statuses(task.status) }),
      invalidate: [projects.listTasks.id],
    },
  );
  return (
    <Card
      title={t('taskBoard')}
      description={t('taskBoardHint')}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setAdding(true);
          }}
        >
          {t('addTask')}
        </Button>
      }
    >
      {move.isError && (
        <div className="p-3">
          <Callout tone="crit" title={message(move.error)} />
        </div>
      )}
      <QueryView query={tasks}>
        {(data) => (
          <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const items = data.items.filter((task) => task.status === column);
              return (
                <section
                  key={column}
                  aria-label={statuses(column)}
                  className="rounded-control bg-surface-2 p-2"
                >
                  <h3 className="mb-2 flex justify-between px-1 text-xs font-semibold tracking-wider text-muted uppercase">
                    {statuses(column)} <span>{items.length}</span>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {items.map((task) => (
                      <li
                        key={task.id}
                        className="rounded-control border border-line bg-surface p-3"
                      >
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          {task.assignees.map((person) => person.name).join(', ')}
                          {task.dueDate !== null && <DateText value={task.dueDate} />}
                        </p>
                        {task.allowedActions.includes('update') ? (
                          <div className="mt-2">
                            <Field label={t('moveTask', { title: task.title })}>
                              {(control) => (
                                <Select
                                  {...control}
                                  value={task.status}
                                  options={COLUMNS.map((status) => ({
                                    value: status,
                                    label: statuses(status),
                                  }))}
                                  onChange={(event) => {
                                    move.mutate({
                                      task,
                                      status: event.target.value as Task['status'],
                                    });
                                  }}
                                />
                              )}
                            </Field>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <TaskStatusPill status={task.status} />
                          </div>
                        )}
                        <TaskCommentsButton task={task} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </QueryView>
      {adding && (
        <NewTaskDialog
          projectId={projectId}
          onClose={() => {
            setAdding(false);
          }}
        />
      )}
    </Card>
  );
}

function Team({
  projectId,
  project,
}: {
  readonly projectId: string;
  readonly project: Project;
}): ReactNode {
  const t = useTranslations('projects');
  const team = useQuery({
    queryKey: [projects.getProjectTeam.id, projectId],
    queryFn: () => browserCall(projects.getProjectTeam, { params: { id: projectId } }),
  });
  return (
    <Card
      title={t('team')}
      {...(team.data !== undefined && {
        actions: <EditTeamButton project={project} team={team.data.items} />,
      })}
    >
      <QueryView query={team}>
        {(data) => (
          <DataTable
            label={t('team')}
            rows={data.items}
            getRowId={(row) => row.user.id}
            loadingState={null}
            errorState={null}
            emptyState={null}
            columns={[
              { id: 'name', header: t('person'), cell: (row) => row.user.name },
              { id: 'role', header: t('role'), cell: (row) => row.role },
              {
                id: 'allocation',
                header: t('allocation'),
                align: 'right',
                cell: (row) => `${row.allocationPercent}%`,
              },
              {
                id: 'rate',
                header: t('billingRate'),
                align: 'right',
                cell: (row) =>
                  row.billingRate === undefined ? (
                    <span className="text-xs text-muted">{t('hidden')}</span>
                  ) : (
                    <Money value={row.billingRate} />
                  ),
              },
            ]}
          />
        )}
      </QueryView>
    </Card>
  );
}

function ProjectMoney({
  projectId,
  project,
}: {
  readonly projectId: string;
  readonly project: Project;
}): ReactNode {
  const t = useTranslations('projects');
  const budget = useQuery({
    queryKey: [projects.getProjectBudget.id, projectId],
    queryFn: () => browserCall(projects.getProjectBudget, { params: { id: projectId } }),
    retry: false,
  });
  const pnl = useQuery({
    queryKey: [projects.getProjectProfitAndLoss.id, projectId],
    queryFn: () =>
      browserCall(projects.getProjectProfitAndLoss, { params: { id: projectId }, query: {} }),
    retry: false,
  });
  const fees = useList(projects.listFeeAgreements, { projectId });
  // Fee agreements are entered by the books: partners and finance.
  const canBook = useCanRead('finance');
  if (errorCodeOf(budget.error) === 'FORBIDDEN')
    return <Callout tone="info" title={t('moneyHidden')} />;
  return (
    <div className="flex flex-col gap-4">
      <Card
        title={t('budget')}
        {...(budget.data !== undefined && {
          actions: <NewBudgetVersionButton project={project} budget={budget.data} />,
        })}
        {...(budget.data !== undefined && {
          description: t('budgetVersion', { version: budget.data.version }),
        })}
      >
        <QueryView query={budget}>
          {(data) => (
            <DataTable
              label={t('budget')}
              rows={[...data.lines, { category: t('total'), amount: data.total, hours: '' }]}
              getRowId={(row) => row.category}
              loadingState={null}
              errorState={null}
              emptyState={null}
              columns={[
                { id: 'category', header: t('category'), cell: (row) => row.category },
                { id: 'hours', header: t('hours'), align: 'right', cell: (row) => row.hours },
                {
                  id: 'amount',
                  header: t('amount'),
                  align: 'right',
                  cell: (row) => <Money value={row.amount} />,
                },
              ]}
            />
          )}
        </QueryView>
      </Card>
      <Card title={t('pnl')} description={t('pnlHint')}>
        <QueryView query={pnl}>
          {(data) => (
            <DataTable
              label={t('pnl')}
              rows={[
                ...data.income.map((line) => ({ ...line, group: t('income') })),
                ...data.costs.map((line) => ({ ...line, group: t('costs') })),
                {
                  accountCode: '',
                  accountName: t('labourCost'),
                  amount: data.labourCost,
                  group: t('costs'),
                },
                { accountCode: '', accountName: t('profit'), amount: data.profit, group: '' },
              ]}
              getRowId={(row) => `${row.group}-${row.accountCode}-${row.accountName}`}
              loadingState={null}
              errorState={null}
              emptyState={null}
              columns={[
                { id: 'group', header: t('section'), cell: (row) => row.group },
                {
                  id: 'account',
                  header: t('account'),
                  cell: (row) => (
                    <span>
                      {row.accountCode !== '' && (
                        <span className="font-mono text-xs">{row.accountCode} </span>
                      )}
                      {row.accountName}
                    </span>
                  ),
                },
                {
                  id: 'amount',
                  header: t('amount'),
                  align: 'right',
                  cell: (row) => <Money value={row.amount} />,
                },
              ]}
            />
          )}
        </QueryView>
      </Card>
      <RecordTable
        label={t('fees')}
        list={fees}
        getRowId={(row) => row.id}
        empty={t('noFees')}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t('fees')}</p>
            {canBook && <NewFeeAgreementButton projectId={projectId} />}
          </div>
        }
        columns={[
          { id: 'payee', header: t('payee'), cell: (row) => row.payee.name },
          { id: 'description', header: t('description'), cell: (row) => row.description },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) =>
              row.amount === undefined ? (
                <span className="text-xs text-muted">{t('hidden')}</span>
              ) : (
                <Money value={row.amount} />
              ),
          },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => <StatusPill tone="info">{row.status}</StatusPill>,
          },
        ]}
      />
    </div>
  );
}

function Header({ project }: { readonly project: Project }): ReactNode {
  const t = useTranslations('projects');
  const types = useTranslations('projects.types');
  const statuses = useTranslations('projects.projectStatus');
  return (
    <>
      <Link href="/projects" className="text-sm text-muted hover:underline">
        {t('back')}
      </Link>
      <PageHeader
        title={`${project.code} · ${project.name}`}
        description={t('headerLine', { type: types(project.type), manager: project.manager.name })}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill tone="good">{statuses(project.status)}</StatusPill>
            <ProjectStatusButton project={project} />
            <EditProjectButton project={project} />
          </span>
        }
      />
    </>
  );
}

export function ProjectDetail({ id }: { readonly id: string }): ReactNode {
  const t = useTranslations('projects');
  const project = useQuery({
    queryKey: [projects.getProject.id, id],
    queryFn: () => browserCall(projects.getProject, { params: { id } }),
  });
  if (project.isPending) return <LoadingState />;
  if (project.data === undefined) {
    return (
      <div className="rounded-card border border-line bg-surface">
        <EmptyState titleAs="h1" title={t('notFound')} description={t('notFoundDescription')} />
      </div>
    );
  }
  return (
    <>
      <Header project={project.data} />
      <div className="flex flex-col gap-4">
        <Overview projectId={id} />
        <Tabs
          label={t('projectSections')}
          items={[
            { value: 'board', label: t('taskBoard'), content: <TaskBoard projectId={id} /> },
            {
              value: 'milestones',
              label: t('milestones'),
              content: <Milestones projectId={id} project={project.data} />,
            },
            {
              value: 'team',
              label: t('team'),
              content: <Team projectId={id} project={project.data} />,
            },
            {
              value: 'money',
              label: t('budgetAndPnl'),
              content: <ProjectMoney projectId={id} project={project.data} />,
            },
          ]}
        />
      </div>
    </>
  );
}
