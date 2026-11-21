'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  CreateBudgetVersion,
  CreateFeeAgreement,
  CreateMilestone,
  CreateProject,
  CreateTaskComment,
  CreateTimesheet,
  ProjectStatus,
  ProjectType,
  ReplaceProjectTeam,
  SetProjectStatus,
  UpdateProject,
  UpdateTimesheet,
  coreEndpoints as core,
  crmEndpoints as crm,
  projectsEndpoints as projects,
} from '@pitchforge/contracts';
import type { Project, ProjectBudget, Task, TeamMember, Timesheet } from '@pitchforge/contracts';
import { Button, Callout, Dialog, Field, Textarea } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { nextWeekStart, today } from '../common/dates.ts';
import { useErrorMessage } from '../common/errors.ts';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import type { FormSpec } from '../common/form-dialog.tsx';
import { errorFor, fieldErrors } from '../common/form-errors.ts';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';
import { typed } from '../finance/forms.tsx';

function useUserOptions() {
  const users = useList(core.listUsers, {});
  return users.items.map((user) => ({ value: user.id, label: user.name }));
}

/* Projects ---------------------------------------------------------------------------------- */

function useProjectFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const types = useTranslations('projects.types');
  const users = useUserOptions();
  const clients = useList(crm.listClients, {});
  const contracts = useList(crm.listContracts, {});
  return [
    {
      name: 'code',
      label: t('fields.projectCode'),
      kind: 'text',
      required: true,
      hint: t('projectCodeHint'),
    },
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    {
      name: 'type',
      label: t('fields.type'),
      kind: 'select',
      required: true,
      options: ProjectType.options.map((value) => ({ value, label: types(value) })),
    },
    {
      name: 'clientId',
      label: t('fields.client'),
      kind: 'select',
      nullable: true,
      options: clients.items.map((client) => ({ value: client.id, label: client.name })),
    },
    {
      name: 'contractId',
      label: t('fields.contract'),
      kind: 'select',
      nullable: true,
      options: contracts.items.map((contract) => ({ value: contract.id, label: contract.title })),
    },
    {
      name: 'managerId',
      label: t('fields.manager'),
      kind: 'select',
      required: true,
      options: users,
    },
    { name: 'value', label: t('fields.value'), kind: 'money', required: true },
    { name: 'startDate', label: t('fields.startDate'), kind: 'date', required: true },
    { name: 'endDate', label: t('fields.endDate'), kind: 'date', nullable: true },
  ];
}

export function NewProjectButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useProjectFields();
  return (
    <DialogButton label={t('newProject')}>
      {(close) => (
        <FormDialog
          title={t('newProject')}
          submitLabel={t('save')}
          schema={CreateProject}
          fields={fields}
          initial={{ type: 'fixed_price', startDate: today() }}
          submit={(body) => browserCall(projects.createProject, { body })}
          success={t('saved')}
          invalidate={[projects.listProjects.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditProjectButton({ project }: { readonly project: Project }): ReactNode {
  const t = useTranslations('forms');
  const fields = useProjectFields().filter((field) => field.name !== 'code');
  if (!project.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: project.code })}
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: project.code })}
          submitLabel={t('save')}
          schema={UpdateProject}
          fields={fields}
          initial={{
            name: project.name,
            type: project.type,
            clientId: project.clientId ?? '',
            contractId: project.contractId ?? '',
            managerId: project.manager.id,
            value: typed(project.value),
            startDate: project.startDate,
            endDate: project.endDate ?? '',
          }}
          submit={(body) =>
            browserCall(projects.updateProject, {
              params: { id: project.id },
              body,
              ifMatch: `"${String(project.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[projects.getProject.id, projects.listProjects.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function ProjectStatusButton({ project }: { readonly project: Project }): ReactNode {
  const t = useTranslations('forms');
  const statuses = useTranslations('projects.projectStatus');
  if (!project.allowedActions.includes('set_status')) return null;
  return (
    <DialogButton
      label={t('setStatus')}
      ariaLabel={t('projectStatusLabel', { name: project.code })}
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('projectStatusLabel', { name: project.code })}
          submitLabel={t('save')}
          schema={SetProjectStatus}
          fields={[
            {
              name: 'status',
              label: t('fields.status'),
              kind: 'select',
              required: true,
              options: ProjectStatus.options.map((value) => ({ value, label: statuses(value) })),
            },
          ]}
          initial={{ status: project.status }}
          submit={(body) =>
            browserCall(projects.setProjectStatus, {
              params: { id: project.id },
              body,
              ifMatch: `"${String(project.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[projects.getProject.id, projects.listProjects.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/**
 * The team, with roles, allocation and billing rates. Offered only to someone who reads the
 * rates: saving replaces the team, so an editor who cannot see a rate would erase it.
 */
export function EditTeamButton({
  project,
  team,
}: {
  readonly project: Project;
  readonly team: readonly TeamMember[];
}): ReactNode {
  const t = useTranslations('forms');
  const users = useUserOptions();
  if (!project.allowedActions.includes('update')) return null;
  if (team.some((member) => member.billingRate === undefined)) return null;
  return (
    <DialogButton label={t('editTeam')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('editTeamOf', { name: project.code })}
          submitLabel={t('save')}
          schema={ReplaceProjectTeam}
          fields={[
            {
              name: 'members',
              label: t('fields.team'),
              kind: 'lines',
              addLabel: t('addPerson'),
              minRows: 0,
              fields: [
                { name: 'userId', label: t('fields.person'), kind: 'select', options: users },
                { name: 'role', label: t('fields.role'), kind: 'text' },
                { name: 'allocationPercent', label: t('fields.allocation'), kind: 'decimal' },
                {
                  name: 'billingRate',
                  label: t('fields.billingRate'),
                  kind: 'money',
                  nullable: true,
                },
              ],
            },
          ]}
          initial={{
            members: team.map((member) => ({
              userId: member.user.id,
              role: member.role,
              allocationPercent: member.allocationPercent,
              billingRate: member.billingRate === undefined ? '' : typed(member.billingRate),
            })),
          }}
          submit={(body) =>
            browserCall(projects.replaceProjectTeam, { params: { id: project.id }, body })
          }
          success={t('saved')}
          invalidate={[projects.getProjectTeam.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewBudgetVersionButton({
  project,
  budget,
}: {
  readonly project: Project;
  readonly budget: ProjectBudget;
}): ReactNode {
  const t = useTranslations('forms');
  if (!project.allowedActions.includes('update')) return null;
  return (
    <DialogButton label={t('newBudgetVersion')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newBudgetVersion')}
          description={t('budgetVersionHint', { version: budget.version + 1 })}
          submitLabel={t('save')}
          schema={CreateBudgetVersion}
          fields={[
            {
              name: 'lines',
              label: t('fields.lines'),
              kind: 'lines',
              addLabel: t('addLine'),
              fields: [
                { name: 'category', label: t('fields.category'), kind: 'text' },
                { name: 'hours', label: t('fields.hours'), kind: 'decimal' },
                { name: 'amount', label: t('fields.amount'), kind: 'money' },
              ],
            },
            { name: 'reason', label: t('fields.reason'), kind: 'textarea', required: true },
          ]}
          initial={{
            lines: budget.lines.map((line) => ({
              category: line.category,
              hours: line.hours,
              amount: typed(line.amount),
            })),
          }}
          note={t('totalsByServer')}
          submit={(body) =>
            browserCall(projects.createBudgetVersion, { params: { id: project.id }, body })
          }
          success={t('saved')}
          invalidate={[projects.getProjectBudget.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewMilestoneButton({ project }: { readonly project: Project }): ReactNode {
  const t = useTranslations('forms');
  if (!project.allowedActions.includes('update')) return null;
  return (
    <DialogButton label={t('newMilestone')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newMilestone')}
          submitLabel={t('save')}
          schema={CreateMilestone}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            {
              name: 'deliverables',
              label: t('fields.deliverables'),
              kind: 'textarea',
              nullable: true,
            },
            { name: 'weightPercent', label: t('fields.weight'), kind: 'decimal', required: true },
            {
              name: 'billingAmount',
              label: t('fields.billingAmount'),
              kind: 'money',
              required: true,
            },
            { name: 'dueDate', label: t('fields.dueDate'), kind: 'date', required: true },
          ]}
          submit={(body) =>
            browserCall(projects.createMilestone, { params: { id: project.id }, body })
          }
          success={t('saved')}
          invalidate={[projects.listMilestones.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewFeeAgreementButton({ projectId }: { readonly projectId: string }): ReactNode {
  const t = useTranslations('forms');
  const contacts = useList(core.listContacts, {});
  return (
    <DialogButton label={t('newFeeAgreement')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('newFeeAgreement')}
          submitLabel={t('save')}
          schema={CreateFeeAgreement}
          fields={[
            {
              name: 'payeeContactId',
              label: t('fields.payee'),
              kind: 'select',
              required: true,
              options: contacts.items.map((contact) => ({
                value: contact.id,
                label: contact.name,
              })),
            },
            { name: 'description', label: t('fields.description'), kind: 'text', required: true },
            { name: 'amount', label: t('fields.amount'), kind: 'money', required: true },
            { name: 'startDate', label: t('fields.startDate'), kind: 'date', required: true },
            { name: 'endDate', label: t('fields.endDate'), kind: 'date', nullable: true },
          ]}
          initial={{ startDate: today() }}
          fixed={{ projectId }}
          submit={(body) => browserCall(projects.createFeeAgreement, { body })}
          success={t('saved')}
          invalidate={[projects.listFeeAgreements.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Task comments ----------------------------------------------------------------------------- */

export function TaskCommentsButton({ task }: { readonly task: Task }): ReactNode {
  const t = useTranslations('forms');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        aria-label={t('commentsOn', { title: task.title })}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('comments')}
      </Button>
      {open && (
        <CommentsDialog
          task={task}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function CommentsDialog({
  task,
  onClose,
}: {
  readonly task: Task;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('forms');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const comments = useQuery({
    queryKey: [projects.listTaskComments.id, task.id],
    queryFn: () => browserCall(projects.listTaskComments, { params: { id: task.id }, query: {} }),
  });
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const post = useCommand(
    (body: CreateTaskComment) =>
      browserCall(projects.addTaskComment, { params: { id: task.id }, body }),
    {
      success: t('commentPosted'),
      invalidate: [projects.listTaskComments.id],
      onSuccess: () => {
        setText('');
      },
    },
  );
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('commentsOn', { title: task.title })}
      closeLabel={common('close')}
    >
      <div className="flex flex-col gap-4">
        <QueryView
          query={comments}
          isEmpty={(data) => data.items.length === 0}
          empty={{ title: t('noComments') }}
        >
          {(data) => (
            <ul className="flex flex-col gap-3 text-sm">
              {data.items.map((comment) => (
                <li key={comment.id} className="rounded-control bg-surface-2 p-3">
                  <p className="text-xs text-muted">
                    {comment.author.name} · <TimeText value={comment.createdAt} />
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
        {task.allowedActions.includes('comment') && (
          <div className="flex flex-col gap-2">
            {post.isError && <Callout tone="crit" title={message(post.error)} />}
            <Field label={t('fields.comment')} {...errorFor(errors, 'body')}>
              {(control) => (
                <Textarea
                  {...control}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                  }}
                />
              )}
            </Field>
            <div className="flex justify-end">
              <Button
                loading={post.isPending}
                onClick={() => {
                  const result = CreateTaskComment.safeParse({
                    body: text.trim(),
                    mentionedUserIds: [],
                  });
                  setErrors(fieldErrors(result));
                  if (result.success) post.mutate(result.data);
                }}
              >
                {t('postComment')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* Timesheets -------------------------------------------------------------------------------- */

function useTimesheetFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const list = useList(projects.listProjects, {});
  return [
    { name: 'weekStart', label: t('fields.weekStart'), kind: 'date', required: true },
    {
      name: 'entries',
      label: t('fields.entries'),
      kind: 'lines',
      addLabel: t('addLine'),
      fields: [
        {
          name: 'projectId',
          label: t('fields.project'),
          kind: 'select',
          options: list.items.map((project) => ({
            value: project.id,
            label: `${project.code} · ${project.name}`,
          })),
        },
        { name: 'date', label: t('fields.date'), kind: 'date' },
        { name: 'hours', label: t('fields.hours'), kind: 'decimal' },
        { name: 'note', label: t('fields.note'), kind: 'text', nullable: true },
        { name: 'taskId', label: t('fields.task'), kind: 'hidden', nullable: true },
      ],
    },
  ];
}

export function NewTimesheetButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useTimesheetFields();
  return (
    <DialogButton label={t('newTimesheet')}>
      {(close) => (
        <FormDialog
          title={t('newTimesheet')}
          submitLabel={t('saveDraft')}
          schema={CreateTimesheet}
          fields={fields}
          initial={{ weekStart: nextWeekStart() }}
          note={t('hoursByServer')}
          submit={(body) => browserCall(projects.createTimesheet, { body })}
          success={t('saved')}
          invalidate={[projects.listTimesheets.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditTimesheetButton({ sheet }: { readonly sheet: Timesheet }): ReactNode {
  const t = useTranslations('forms');
  const fields = useTimesheetFields();
  if (!sheet.allowedActions.includes('update')) return null;
  return (
    <DialogButton label={t('edit')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('editTimesheet')}
          submitLabel={t('save')}
          schema={UpdateTimesheet}
          fields={fields}
          initial={{
            weekStart: sheet.weekStart,
            entries: sheet.entries.map((entry) => ({
              projectId: entry.projectId,
              date: entry.date,
              hours: entry.hours,
              note: entry.note ?? '',
              taskId: entry.taskId ?? '',
            })),
          }}
          note={t('hoursByServer')}
          submit={(body) =>
            browserCall(projects.updateTimesheet, {
              params: { id: sheet.id },
              body,
              ifMatch: `"${String(sheet.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[projects.listTimesheets.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}
