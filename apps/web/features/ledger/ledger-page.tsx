'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';

import { CreateManualJournal, accountingEndpoints as accounting } from '@pitchforge/contracts';
import type { Account, FiscalPeriod, JournalEntry, ManualJournal } from '@pitchforge/contracts';
import { todayInDhaka } from '@pitchforge/shared-kernel';
import type { BusinessDate } from '@pitchforge/shared-kernel';
import {
  Button,
  Callout,
  DateInput,
  DateText,
  Dialog,
  Field,
  Input,
  Select,
  StatusPill,
  Tabs,
  Tag,
  Textarea,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { errorFor, fieldErrors } from '../common/form-errors.ts';
import { moneyFromInput } from '../common/money-input.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { Details, RecordTable } from '../common/record-table.tsx';
import { useCanRead } from '../common/session.tsx';
import { ForbiddenState, QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';
import { useList } from '../common/use-list.ts';
import { PostingLines } from '../finance/posting-lines.tsx';

/** How deep an account sits in the tree, for indenting only. */
function depthOf(account: Account, byId: ReadonlyMap<string, Account>): number {
  let depth = 0;
  let parent = account.parentId === null ? undefined : byId.get(account.parentId);
  while (parent !== undefined && depth < 6) {
    depth += 1;
    parent = parent.parentId === null ? undefined : byId.get(parent.parentId);
  }
  return depth;
}

const INDENT = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20', 'pl-24'] as const;

function ChartTab(): ReactNode {
  const t = useTranslations('ledger');
  const types = useTranslations('ledger.accountTypes');
  const accounts = useList(accounting.listAccounts, { limit: 200 });
  const byId = new Map(accounts.items.map((account) => [account.id, account]));
  return (
    <RecordTable
      label={t('chart')}
      list={accounts}
      getRowId={(row) => row.id}
      toolbar={<p className="text-xs text-muted">{t('chartHint')}</p>}
      columns={[
        {
          id: 'code',
          header: t('code'),
          cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
        },
        {
          id: 'name',
          header: t('name'),
          cell: (row) => {
            const heading = accounts.items.some((other) => other.parentId === row.id);
            return (
              <span
                className={`${INDENT.at(depthOf(row, byId)) ?? 'pl-24'} ${heading ? 'font-semibold' : ''}`}
              >
                {row.name}
              </span>
            );
          },
        },
        { id: 'type', header: t('type'), cell: (row) => types(row.type) },
        {
          id: 'normal',
          header: t('normalBalance'),
          cell: (row) => (row.normalBalance === 'debit' ? t('debit') : t('credit')),
        },
        {
          id: 'control',
          header: t('control'),
          cell: (row) =>
            row.isControl ? <StatusPill tone="info">{t('engineOnly')}</StatusPill> : null,
        },
      ]}
    />
  );
}

function ReverseForm({
  entry,
  onDone,
}: {
  readonly entry: JournalEntry;
  readonly onDone: () => void;
}): ReactNode {
  const t = useTranslations('ledger');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [reason, setReason] = useState('');
  const reverse = useCommand(
    () =>
      browserCall(accounting.reverseJournalEntry, {
        params: { id: entry.id },
        body: { reversalDate: todayInDhaka(), reason: reason.trim() },
      }),
    {
      success: (result) => t('reversed', { entry: result.reversal.entryNo }),
      invalidate: [accounting.listJournalEntries.id],
      onSuccess: onDone,
    },
  );
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      {reverse.isError && <Callout tone="crit" title={message(reverse.error)} />}
      <Field
        label={t('reverseReason')}
        hint={t('reverseHint')}
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
      <div className="flex justify-end">
        <Button
          variant="danger"
          loading={reverse.isPending}
          disabled={reason.trim().length < 3}
          onClick={() => {
            reverse.mutate(undefined);
          }}
        >
          {t('reverse')}
        </Button>
      </div>
    </div>
  );
}

function EntryDialog({
  entry,
  onClose,
}: {
  readonly entry: JournalEntry;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('ledger');
  const common = useTranslations('common');
  const [reversing, setReversing] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={entry.entryNo}
      description={entry.description}
      closeLabel={common('close')}
    >
      <div className="flex flex-col gap-4">
        <Details
          items={[
            [t('date'), <DateText key="d" value={entry.entryDate} />],
            [t('source'), <Tag key="s">{entry.sourceType}</Tag>],
            [t('status'), entry.status === 'posted' ? t('posted') : t('reversedStatus')],
            [t('postedBy'), entry.postedBy.name],
            [t('postedAt'), <TimeText key="p" value={entry.postedAt} />],
          ]}
        />
        <PostingLines
          title={t('lines')}
          lines={entry.lines}
          totals={{ debit: entry.totalDebit, credit: entry.totalCredit }}
          note={t('immutable')}
        />
        {entry.allowedActions.includes('reverse') &&
          (reversing ? (
            <ReverseForm entry={entry} onDone={onClose} />
          ) : (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setReversing(true);
                }}
              >
                {t('reverse')}
              </Button>
            </div>
          ))}
      </div>
    </Dialog>
  );
}

function JournalTab(): ReactNode {
  const t = useTranslations('ledger');
  const entries = useList(accounting.listJournalEntries, {});
  const [open, setOpen] = useState<JournalEntry | null>(null);
  return (
    <>
      <RecordTable
        label={t('journal')}
        list={entries}
        getRowId={(row) => row.id}
        columns={[
          {
            id: 'entryNo',
            header: t('entry'),
            cell: (row) => (
              <button
                type="button"
                className="font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.entryNo}
              </button>
            ),
          },
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.entryDate} /> },
          { id: 'description', header: t('description'), cell: (row) => row.description },
          { id: 'source', header: t('source'), cell: (row) => <Tag>{row.sourceType}</Tag> },
          {
            id: 'status',
            header: t('status'),
            cell: (row) =>
              row.status === 'reversed' ? (
                <StatusPill tone="warn">{t('reversedStatus')}</StatusPill>
              ) : row.reversalOfId !== null ? (
                <StatusPill tone="info">{t('reversal')}</StatusPill>
              ) : (
                <StatusPill tone="good">{t('posted')}</StatusPill>
              ),
          },
        ]}
      />
      {open !== null && (
        <EntryDialog
          entry={open}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

const JV_TONE: Readonly<Record<ManualJournal['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  posted: 'good',
  rejected: 'crit',
};

function ManualJournalDialog({
  journal,
  accounts,
  onClose,
}: {
  readonly journal: ManualJournal;
  readonly accounts: ReadonlyMap<string, Account>;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('ledger');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const submit = useCommand(
    () =>
      browserCall(accounting.submitManualJournal, {
        params: { id: journal.id },
        ifMatch: `"${String(journal.meta.version)}"`,
      }),
    {
      success: t('jvSubmitted'),
      invalidate: [accounting.listManualJournals.id],
      onSuccess: onClose,
    },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={journal.number ?? t('draftJv')}
      description={journal.description}
      closeLabel={common('close')}
      footer={
        journal.allowedActions.includes('submit') ? (
          <Button
            loading={submit.isPending}
            onClick={() => {
              submit.mutate(undefined);
            }}
          >
            {t('submitForApproval')}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {submit.isError && <Callout tone="crit" title={message(submit.error)} />}
        <Details
          items={[
            [t('date'), <DateText key="d" value={journal.entryDate} />],

            [
              t('status'),
              <StatusPill key="s" tone={JV_TONE[journal.status]}>
                {t(`jvStatus.${journal.status}`)}
              </StatusPill>,
            ],
            [t('journalEntry'), journal.journalEntryNo ?? '—'],
          ]}
        />
        <PostingLines
          title={t('lines')}
          note={t('jvNote')}
          lines={journal.lines.map((line) => {
            const account = accounts.get(line.accountId);
            return {
              accountCode: account?.code ?? '—',
              accountName: account?.name ?? '',
              description: line.description,
              debit: line.debit,
              credit: line.credit,
            };
          })}
        />
      </div>
    </Dialog>
  );
}

interface LineDraft {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

const emptyLine = (): LineDraft => ({ accountId: '', description: '', debit: '', credit: '' });

function NewJournalDialog({
  accounts,
  onClose,
}: {
  readonly accounts: readonly Account[];
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('ledger');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [entryDate, setEntryDate] = useState<BusinessDate | null>(todayInDhaka());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const create = useCommand(
    (body: CreateManualJournal) => browserCall(accounting.createManualJournal, { body }),
    { success: t('jvSaved'), invalidate: [accounting.listManualJournals.id], onSuccess: onClose },
  );

  const update = (index: number, change: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line, at) => (at === index ? { ...line, ...change } : line)),
    );
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const zero = { amount: '0.00', currency: 'BDT' as const };
    const result = CreateManualJournal.safeParse({
      entryDate: entryDate ?? '',
      description: description.trim(),
      lines: lines.map((line) => ({
        accountId: line.accountId,
        description: line.description.trim() === '' ? null : line.description.trim(),
        debit:
          line.debit.trim() === ''
            ? zero
            : (moneyFromInput(line.debit) ?? { amount: line.debit, currency: 'BDT' }),
        credit:
          line.credit.trim() === ''
            ? zero
            : (moneyFromInput(line.credit) ?? { amount: line.credit, currency: 'BDT' }),
        projectId: null,
        departmentId: null,
        costCenterId: null,
        employeeId: null,
        partnerId: null,
        contactId: null,
      })),
      fileIds: [],
    });
    setErrors(fieldErrors(result));
    if (result.success) create.mutate(result.data);
  };

  const options = accounts
    .filter((account) => !accounts.some((other) => other.parentId === account.id))
    .map((account) => ({ value: account.id, label: `${account.code} · ${account.name}` }));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('newJv')}
      description={t('newJvDescription')}
      closeLabel={common('close')}
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
        {create.isError && <Callout tone="crit" title={message(create.error)} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('date')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'entryDate')}
          >
            {(control) => (
              <DateInput
                {...control}
                value={entryDate}
                placeholder={t('chooseDate')}
                onChange={(value) => {
                  setEntryDate(value as BusinessDate | null);
                }}
              />
            )}
          </Field>
          <Field
            label={t('description')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'description')}
          >
            {(control) => (
              <Input
                {...control}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
              />
            )}
          </Field>
        </div>
        {lines.map((line, index) => (
          <fieldset
            key={index}
            className="grid gap-2 rounded-control border border-line p-3 sm:grid-cols-2"
          >
            <legend className="px-1 text-xs text-muted">
              {t('lineNumber', { number: index + 1 })}
            </legend>
            <Field label={t('account')} {...errorFor(errors, `lines.${String(index)}.accountId`)}>
              {(control) => (
                <Select
                  {...control}
                  value={line.accountId}
                  placeholder={t('chooseAccount')}
                  options={options}
                  onChange={(event) => {
                    update(index, { accountId: event.target.value });
                  }}
                />
              )}
            </Field>
            <Field label={t('memo')}>
              {(control) => (
                <Input
                  {...control}
                  value={line.description}
                  onChange={(event) => {
                    update(index, { description: event.target.value });
                  }}
                />
              )}
            </Field>
            <Field label={t('debit')} {...errorFor(errors, `lines.${String(index)}.debit`)}>
              {(control) => (
                <Input
                  {...control}
                  inputMode="decimal"
                  value={line.debit}
                  onChange={(event) => {
                    update(index, { debit: event.target.value });
                  }}
                />
              )}
            </Field>
            <Field label={t('credit')} {...errorFor(errors, `lines.${String(index)}.credit`)}>
              {(control) => (
                <Input
                  {...control}
                  inputMode="decimal"
                  value={line.credit}
                  onChange={(event) => {
                    update(index, { credit: event.target.value });
                  }}
                />
              )}
            </Field>
          </fieldset>
        ))}
        <p className="text-xs text-muted">{t('balanceByServer')}</p>
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setLines((current) => [...current, emptyLine()]);
            }}
          >
            {t('addLine')}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {common('cancel')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('saveDraft')}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function ManualJournalsTab(): ReactNode {
  const t = useTranslations('ledger');
  const journals = useList(accounting.listManualJournals, {});
  const accounts = useList(accounting.listAccounts, { limit: 200 });
  const byId = new Map(accounts.items.map((account) => [account.id, account]));
  const [open, setOpen] = useState<ManualJournal | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <RecordTable
        label={t('manualJournals')}
        list={journals}
        getRowId={(row) => row.id}
        toolbar={
          <>
            <p className="text-xs text-muted">{t('manualHint')}</p>
            <Button
              size="sm"
              onClick={() => {
                setCreating(true);
              }}
            >
              {t('newJv')}
            </Button>
          </>
        }
        columns={[
          {
            id: 'number',
            header: t('jv'),
            cell: (row) => (
              <button
                type="button"
                className="text-left font-mono text-[13px] text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  setOpen(row);
                }}
              >
                {row.number ?? t('draftJv')}
              </button>
            ),
          },
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.entryDate} /> },
          { id: 'description', header: t('description'), cell: (row) => row.description },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill tone={JV_TONE[row.status]}>{t(`jvStatus.${row.status}`)}</StatusPill>
            ),
          },
        ]}
      />
      {open !== null && (
        <ManualJournalDialog
          journal={open}
          accounts={byId}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
      {creating && (
        <NewJournalDialog
          accounts={accounts.items}
          onClose={() => {
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function ReopenDialog({
  period,
  onClose,
}: {
  readonly period: FiscalPeriod;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('ledger');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [reason, setReason] = useState('');
  const reopen = useCommand(
    () =>
      browserCall(accounting.reopenFiscalPeriod, {
        params: { id: period.id },
        body: { reason: reason.trim() },
        ifMatch: `"${String(period.meta.version)}"`,
      }),
    { success: t('reopened'), invalidate: [accounting.listFiscalPeriods.id], onSuccess: onClose },
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('reopenTitle', { month: period.startDate.slice(0, 7) })}
      description={t('reopenDescription')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            variant="danger"
            loading={reopen.isPending}
            disabled={reason.trim().length < 3}
            onClick={() => {
              reopen.mutate(undefined);
            }}
          >
            {t('reopen')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {reopen.isError && <Callout tone="crit" title={message(reopen.error)} />}
        <Field label={t('reopenReason')} required requiredLabel={common('required')}>
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

function Checklist({ periodId }: { readonly periodId: string }): ReactNode {
  const t = useTranslations('ledger');
  const checklist = useQuery({
    queryKey: [accounting.getCloseChecklist.id, periodId],
    queryFn: () => browserCall(accounting.getCloseChecklist, { params: { id: periodId } }),
  });
  return (
    <Card title={t('checklist')} description={t('checklistDescription')}>
      <QueryView query={checklist}>
        {(data) => (
          <ul className="flex flex-col gap-2 p-4">
            {data.items.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>{item.label}</span>
                {item.done ? (
                  <StatusPill tone="good">
                    {t('done', { name: item.doneBy?.name ?? '' })}
                  </StatusPill>
                ) : (
                  <StatusPill tone="warn">{t('notDone')}</StatusPill>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Card>
  );
}

function PeriodsTab(): ReactNode {
  const t = useTranslations('ledger');
  const periods = useList(accounting.listFiscalPeriods, {});
  const [reopening, setReopening] = useState<FiscalPeriod | null>(null);
  const message = useErrorMessage();
  const lock = useCommand(
    (period: FiscalPeriod) =>
      browserCall(accounting.lockFiscalPeriod, {
        params: { id: period.id },
        ifMatch: `"${String(period.meta.version)}"`,
      }),
    { success: t('locked'), invalidate: [accounting.listFiscalPeriods.id] },
  );
  const firstOpen = periods.items.find((period) => period.status === 'open');
  return (
    <div className="flex flex-col gap-4">
      {lock.isError && <Callout tone="crit" title={message(lock.error)} />}
      <RecordTable
        label={t('periods')}
        list={periods}
        getRowId={(row) => row.id}
        columns={[
          {
            id: 'month',
            header: t('month'),
            cell: (row) => <span className="font-mono">{row.startDate.slice(0, 7)}</span>,
          },
          {
            id: 'dates',
            header: t('dates'),
            cell: (row) => (
              <span className="flex flex-wrap gap-1">
                <DateText value={row.startDate} /> – <DateText value={row.endDate} />
              </span>
            ),
          },
          {
            id: 'status',
            header: t('status'),
            cell: (row) =>
              row.status === 'locked' ? (
                <StatusPill tone="neutral">
                  {t('lockedBy', { name: row.lockedBy?.name ?? '' })}
                </StatusPill>
              ) : (
                <StatusPill tone="good">{t('open')}</StatusPill>
              ),
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) => (
              <span className="flex justify-end gap-2">
                {row.allowedActions.includes('lock') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={lock.isPending && lock.variables.id === row.id}
                    onClick={() => {
                      lock.mutate(row);
                    }}
                  >
                    {t('lock')}
                  </Button>
                )}
                {row.allowedActions.includes('reopen') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReopening(row);
                    }}
                  >
                    {t('reopen')}
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
      {firstOpen !== undefined && <Checklist periodId={firstOpen.id} />}
      {reopening !== null && (
        <ReopenDialog
          period={reopening}
          onClose={() => {
            setReopening(null);
          }}
        />
      )}
    </div>
  );
}

function SettingsTab(): ReactNode {
  const t = useTranslations('ledger');
  const rules = useList(accounting.listPostingRules, {});
  const rates = useList(accounting.listExchangeRates, {});
  const taxCodes = useList(accounting.listTaxCodes, {});
  const withholding = useList(accounting.listWithholdingRules, {});
  return (
    <div className="flex flex-col gap-4">
      <RecordTable
        label={t('postingRules')}
        list={rules}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('postingRules')}</p>}
        columns={[
          { id: 'name', header: t('name'), cell: (row) => row.name },
          { id: 'source', header: t('source'), cell: (row) => <Tag>{row.sourceType}</Tag> },
          { id: 'lines', header: t('lines'), align: 'right', cell: (row) => row.lines.length },
          { id: 'from', header: t('validFrom'), cell: (row) => <DateText value={row.validFrom} /> },
        ]}
      />
      <RecordTable
        label={t('taxCodes')}
        list={taxCodes}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('taxCodes')}</p>}
        columns={[
          { id: 'code', header: t('code'), cell: (row) => <Tag>{row.code}</Tag> },
          { id: 'name', header: t('name'), cell: (row) => row.name },
          {
            id: 'rate',
            header: t('rate'),
            align: 'right',
            cell: (row) => <span className="tabular-nums">{row.rate}</span>,
          },
          { id: 'from', header: t('validFrom'), cell: (row) => <DateText value={row.validFrom} /> },
        ]}
      />
      <RecordTable
        label={t('withholdingRules')}
        list={withholding}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('withholdingRules')}</p>}
        columns={[
          { id: 'kind', header: t('kind'), cell: (row) => row.kind.toUpperCase() },
          { id: 'category', header: t('category'), cell: (row) => row.category },
          {
            id: 'rate',
            header: t('rate'),
            align: 'right',
            cell: (row) => <span className="tabular-nums">{row.rate}</span>,
          },
          { id: 'from', header: t('validFrom'), cell: (row) => <DateText value={row.validFrom} /> },
        ]}
      />
      <RecordTable
        label={t('exchangeRates')}
        list={rates}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('exchangeRates')}</p>}
        columns={[
          { id: 'currency', header: t('currency'), cell: (row) => row.currency },
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
          {
            id: 'rate',
            header: t('rateToBdt'),
            align: 'right',
            cell: (row) => <span className="tabular-nums">{row.rate}</span>,
          },
        ]}
      />
    </div>
  );
}

export function LedgerPage(): ReactNode {
  const t = useTranslations('ledger');
  const allowed = useCanRead('ledger');
  if (!allowed) return <ForbiddenState />;
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs
        label={t('title')}
        items={[
          { value: 'journal', label: t('journal'), content: <JournalTab /> },
          { value: 'manual', label: t('manualJournals'), content: <ManualJournalsTab /> },
          { value: 'chart', label: t('chart'), content: <ChartTab /> },
          { value: 'periods', label: t('periods'), content: <PeriodsTab /> },
          { value: 'settings', label: t('settings'), content: <SettingsTab /> },
        ]}
      />
    </>
  );
}
