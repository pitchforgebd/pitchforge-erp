'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import type { ApprovalRequest, ApprovalStatus, ApprovalStep } from '@pitchforge/contracts';
import {
  Button,
  Callout,
  Dialog,
  EmptyState,
  Field,
  Money,
  StatusPill,
  Steps,
  Tabs,
  Tag,
  Textarea,
} from '@pitchforge/ui';
import type { StepState, Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { useSession } from '../common/session.tsx';
import { ErrorState, LoadingState, QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';

export const STATUS_TONE: Readonly<Record<ApprovalStatus, Tone>> = {
  pending: 'info',
  approved: 'good',
  rejected: 'crit',
  returned: 'warn',
  cancelled: 'neutral',
};

const STEP_STATE: Readonly<Record<ApprovalStep['status'], StepState>> = {
  approved: 'done',
  skipped: 'done',
  current: 'current',
  waiting: 'waiting',
  rejected: 'rejected',
  returned: 'rejected',
};

export function ApprovalStatusPill({ status }: { readonly status: ApprovalStatus }): ReactNode {
  const t = useTranslations('approvals.status');
  // eslint-disable-next-line security/detect-object-injection -- key is the ApprovalStatus union
  return <StatusPill tone={STATUS_TONE[status]}>{t(status)}</StatusPill>;
}

/** One row of an approval list; opens the review dialog. */
export function ApprovalRow({
  approval,
  onOpen,
}: {
  readonly approval: ApprovalRequest;
  readonly onOpen: (id: string) => void;
}): ReactNode {
  const t = useTranslations('approvals');
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2"
        onClick={() => {
          onOpen(approval.id);
        }}
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">{approval.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Tag>{approval.reference}</Tag>
            {t('requestedBy', { name: approval.requestedBy.name })}
            <TimeText value={approval.requestedAt} />
          </span>
        </span>
        <span className="flex items-center gap-3">
          {approval.amount !== null && <Money value={approval.amount} className="text-sm" />}
          <ApprovalStatusPill status={approval.status} />
        </span>
      </button>
    </li>
  );
}

function PostingTable({ approval }: { readonly approval: ApprovalRequest }): ReactNode {
  const t = useTranslations('approvals');
  if (approval.posting === null) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {approval.status === 'approved' ? t('postingDecided') : t('posting')}
      </p>
      <div
        className="overflow-x-auto rounded-control border border-line"
        role="group"
        aria-label={t('posting')}
        tabIndex={0}
      >
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wider text-muted uppercase">
              <th scope="col" className="px-3 py-2">
                {t('account')}
              </th>
              <th scope="col" className="px-3 py-2">
                {t('memo')}
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                {t('debit')}
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                {t('credit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {approval.posting.lines.map((line, index) => (
              <tr
                key={`${line.accountCode}-${String(index)}`}
                className="border-b border-line last:border-b-0"
              >
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">{line.accountCode}</span> {line.accountName}
                </td>
                <td className="px-3 py-2 text-muted">{line.description ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  {line.debit.amount === '0.00' ? '' : <Money value={line.debit} />}
                </td>
                <td className="px-3 py-2 text-right">
                  {line.credit.amount === '0.00' ? '' : <Money value={line.credit} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{t('postingNote')}</p>
    </div>
  );
}

type ReasonAction = 'reject' | 'return';

function Review({
  approval,
  onDone,
}: {
  readonly approval: ApprovalRequest;
  readonly onDone: () => void;
}): ReactNode {
  const t = useTranslations('approvals');
  const stepState = useTranslations('approvals.stepState');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const session = useSession();
  const [reasonFor, setReasonFor] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState('');
  const invalidate = [core.listApprovals.id, core.getApproval.id];

  const approve = useCommand(
    () =>
      browserCall(core.approve, {
        params: { id: approval.id },
        body: { comment: null },
        ifMatch: `"${String(approval.meta.version)}"`,
      }),
    {
      success: (outcome) =>
        outcome.journalEntryNo === null
          ? t('approved')
          : t('approvedAndPosted', { entry: outcome.journalEntryNo }),
      invalidate,
      onSuccess: onDone,
    },
  );
  const decide = useCommand(
    ({ action, text }: { action: ReasonAction; text: string }) => {
      const options = {
        params: { id: approval.id },
        body: { reason: text },
        ifMatch: `"${String(approval.meta.version)}"`,
      };
      return action === 'reject'
        ? browserCall(core.reject, options)
        : browserCall(core.returnForChanges, options);
    },
    {
      success: (result) => (result.status === 'rejected' ? t('rejected') : t('returned')),
      invalidate,
      onSuccess: onDone,
    },
  );

  const can = (action: ApprovalRequest['allowedActions'][number]) =>
    approval.allowedActions.includes(action);
  const pending = approval.status === 'pending';
  const own = approval.requestedBy.id === session.userId;
  const error = approve.error ?? decide.error;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ApprovalStatusPill status={approval.status} />
        <Tag>{approval.reference}</Tag>
      </div>

      {error !== null && <Callout tone="crit" title={message(error)} />}
      {pending && own && (
        <Callout tone="warn" title={t('ownRequest')}>
          {t('ownRequestDetail')}
        </Callout>
      )}

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-muted">{t('amount')}</dt>
        <dd>{approval.amount === null ? '—' : <Money value={approval.amount} />}</dd>
        <dt className="text-muted">{t('requester')}</dt>
        <dd>{approval.requestedBy.name}</dd>
        <dt className="text-muted">{t('submitted')}</dt>
        <dd>
          <TimeText value={approval.requestedAt} />
        </dd>
        <dt className="text-muted">{t('rule')}</dt>
        <dd>{approval.ruleName}</dd>
      </dl>

      <Steps
        label={t('stepsLabel')}
        stateLabels={{
          done: stepState('done'),
          current: stepState('current'),
          waiting: stepState('waiting'),
          rejected: stepState('rejected'),
        }}
        steps={approval.steps.map((step, index) => ({
          id: String(index),
          label: step.approver?.name ?? step.roleName ?? '—',
          state: STEP_STATE[step.status],
          ...((step.comment !== null || step.decidedAt !== null) && {
            detail: [step.roleName, step.comment].filter((part) => part !== null).join(' · '),
          }),
        }))}
      />

      <PostingTable approval={approval} />
      <p className="text-xs text-muted">{t('attachments', { count: approval.fileIds.length })}</p>

      {reasonFor !== null && (
        <Field
          label={t('reason')}
          hint={t('reasonHint')}
          required
          requiredLabel={common('required')}
          {...(reason.length > 0 && reason.trim().length < 3 && { error: t('reasonInvalid') })}
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
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        {!pending && <p className="mr-auto self-center text-xs text-muted">{t('readOnly')}</p>}
        {pending && !own && approval.allowedActions.length === 0 && (
          <p className="mr-auto self-center text-xs text-muted">{t('waitingOthers')}</p>
        )}
        {reasonFor === null ? (
          <>
            {can('return') && (
              <Button
                variant="secondary"
                onClick={() => {
                  setReasonFor('return');
                }}
              >
                {t('return')}
              </Button>
            )}
            {can('reject') && (
              <Button
                variant="danger"
                onClick={() => {
                  setReasonFor('reject');
                }}
              >
                {t('reject')}
              </Button>
            )}
            {can('approve') && (
              <Button
                loading={approve.isPending}
                onClick={() => {
                  approve.mutate(undefined);
                }}
              >
                {approval.posting === null ? t('approve') : t('approveAndPost')}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setReasonFor(null);
                setReason('');
              }}
            >
              {common('cancel')}
            </Button>
            <Button
              variant={reasonFor === 'reject' ? 'danger' : 'primary'}
              loading={decide.isPending}
              disabled={reason.trim().length < 3}
              onClick={() => {
                decide.mutate({ action: reasonFor, text: reason.trim() });
              }}
            >
              {reasonFor === 'reject' ? t('confirmReject') : t('confirmReturn')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** The review dialog, loading the approval fresh so its steps and actions are current. */
export function ReviewDialog({
  id,
  onClose,
}: {
  readonly id: string | null;
  readonly onClose: () => void;
}): ReactNode {
  const common = useTranslations('common');
  const t = useTranslations('approvals');
  const approval = useQuery({
    queryKey: [core.getApproval.id, id],
    queryFn: () => browserCall(core.getApproval, { params: { id: id ?? '' } }),
    enabled: id !== null,
  });

  return (
    <Dialog
      open={id !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={approval.data?.title ?? t('title')}
      closeLabel={common('close')}
    >
      <QueryView query={approval}>
        {(data) => <Review key={data.id} approval={data} onDone={onClose} />}
      </QueryView>
    </Dialog>
  );
}

function ApprovalList({
  items,
  status,
  error,
  refetch,
  emptyTitle,
  onOpen,
}: {
  readonly items: readonly ApprovalRequest[];
  readonly status: 'loading' | 'error' | 'ready';
  readonly error: unknown;
  readonly refetch: () => void;
  readonly emptyTitle: string;
  readonly onOpen: (id: string) => void;
}): ReactNode {
  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState error={error} onRetry={refetch} />;
  if (items.length === 0) return <EmptyState title={emptyTitle} />;
  return (
    <ul>
      {items.map((approval) => (
        <ApprovalRow key={approval.id} approval={approval} onOpen={onOpen} />
      ))}
    </ul>
  );
}

export function ApprovalsPage(): ReactNode {
  const t = useTranslations('approvals');
  const session = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const waiting = useList(core.listApprovals, { assignedToMe: 'true' });
  const all = useList(core.listApprovals, {});
  const mine = all.items.filter((approval) => approval.requestedBy.id === session.userId);
  const decided = all.items.filter((approval) => approval.status !== 'pending');

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Card>
        <div className="px-2 pt-1">
          <Tabs
            label={t('title')}
            items={[
              {
                value: 'waiting',
                label: `${t('waiting')} (${String(waiting.items.length)})`,
                content: (
                  <ApprovalList {...waiting} emptyTitle={t('emptyWaiting')} onOpen={setOpen} />
                ),
              },
              {
                value: 'mine',
                label: `${t('mine')} (${String(mine.length)})`,
                content: (
                  <ApprovalList
                    {...all}
                    items={mine}
                    emptyTitle={t('emptyMine')}
                    onOpen={setOpen}
                  />
                ),
              },
              {
                value: 'decided',
                label: `${t('decided')} (${String(decided.length)})`,
                content: (
                  <ApprovalList
                    {...all}
                    items={decided}
                    emptyTitle={t('emptyDecided')}
                    onOpen={setOpen}
                  />
                ),
              },
              {
                value: 'all',
                label: t('all'),
                content: <ApprovalList {...all} emptyTitle={t('emptyDecided')} onOpen={setOpen} />,
              },
            ]}
          />
        </div>
      </Card>
      <ReviewDialog
        id={open}
        onClose={() => {
          setOpen(null);
        }}
      />
    </>
  );
}
