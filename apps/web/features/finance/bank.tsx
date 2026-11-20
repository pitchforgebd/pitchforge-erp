'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';

import { CreateTransfer, accountingEndpoints as accounting } from '@pitchforge/contracts';
import type {
  BankStatementLine,
  Cheque,
  EmployeeAdvance,
  ExpenseClaim,
} from '@pitchforge/contracts';
import { todayInDhaka } from '@pitchforge/shared-kernel';
import {
  Button,
  Callout,
  DateText,
  Dialog,
  Field,
  Input,
  KpiTile,
  Money,
  Select,
  StatusPill,
  Tag,
} from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { errorFor, fieldErrors } from '../common/form-errors.ts';
import { moneyFromInput } from '../common/money-input.ts';
import { RecordTable } from '../common/record-table.tsx';
import { QueryView } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';

import {
  AdvanceActions,
  ChequeStatusButton,
  EditBankAccountButton,
  NewAdvanceButton,
  NewBankAccountButton,
  NewChequeButton,
  NewClaimButton,
  PayClaimButton,
  SubmitClaimButton,
} from './forms.tsx';

function TransferDialog({
  fromAccountId,
  onClose,
}: {
  readonly fromAccountId: string;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('finance');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const banks = useList(accounting.listBankAccounts, {});
  const [toAccountId, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [charges, setCharges] = useState('0');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());

  const transfer = useCommand(
    (body: CreateTransfer) => browserCall(accounting.createTransfer, { body }),
    {
      success: t('transferDone'),
      invalidate: [accounting.listBankAccounts.id, accounting.listTransfers.id],
      onSuccess: onClose,
    },
  );

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const result = CreateTransfer.safeParse({
      date: todayInDhaka(),
      fromAccountId,
      toAccountId,
      amount: moneyFromInput(amount) ?? { amount, currency: 'BDT' },
      charges: moneyFromInput(charges) ?? { amount: charges, currency: 'BDT' },
      note: note.trim() === '' ? null : note.trim(),
    });
    setErrors(fieldErrors(result));
    if (result.success) transfer.mutate(result.data);
  };

  const from = banks.items.find((bank) => bank.id === fromAccountId);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('transfer')}
      {...(from !== undefined && { description: t('transferFrom', { name: from.name }) })}
      closeLabel={common('close')}
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
        {transfer.isError && <Callout tone="crit" title={message(transfer.error)} />}
        {errors.get('') !== undefined && <Callout tone="crit" title={errors.get('') ?? ''} />}
        <Field
          label={t('transferTo')}
          required
          requiredLabel={common('required')}
          {...errorFor(errors, 'toAccountId')}
        >
          {(control) => (
            <Select
              {...control}
              value={toAccountId}
              placeholder={t('chooseBank')}
              options={banks.items.map((bank) => ({ value: bank.id, label: bank.name }))}
              onChange={(event) => {
                setTo(event.target.value);
              }}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('amount')}
            required
            requiredLabel={common('required')}
            {...errorFor(errors, 'amount')}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                }}
              />
            )}
          </Field>
          <Field label={t('charges')} {...errorFor(errors, 'charges')}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                value={charges}
                onChange={(event) => {
                  setCharges(event.target.value);
                }}
              />
            )}
          </Field>
        </div>
        <Field label={t('note')}>
          {(control) => (
            <Input
              {...control}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
            />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button type="submit" loading={transfer.isPending}>
            {t('transfer')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function AccountsTab(): ReactNode {
  const t = useTranslations('finance');
  const kinds = useTranslations('finance.bankKinds');
  const banks = useList(accounting.listBankAccounts, {});
  const [from, setFrom] = useState<string | null>(null);
  return (
    <>
      <RecordTable
        label={t('bankAccounts')}
        list={banks}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex justify-end">
            <NewBankAccountButton />
          </div>
        }
        columns={[
          {
            id: 'name',
            header: t('bankAccount'),
            cell: (row) => (
              <span className="flex flex-col">
                <span className="font-medium">{row.name}</span>
                {row.institution !== null && (
                  <span className="text-xs text-muted">{row.institution}</span>
                )}
              </span>
            ),
          },
          {
            id: 'number',
            header: t('accountNumber'),
            cell: (row) =>
              row.accountNumber === undefined ? (
                <span className="text-xs text-muted">{t('hidden')}</span>
              ) : (
                <span className="font-mono text-xs">{row.accountNumber ?? '—'}</span>
              ),
          },
          { id: 'kind', header: t('kind'), cell: (row) => kinds(row.kind) },
          { id: 'ledger', header: t('account'), cell: (row) => <Tag>{row.ledgerAccountCode}</Tag> },
          {
            id: 'balance',
            header: t('bookBalance'),
            align: 'right',
            cell: (row) => <Money value={row.balance} />,
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) => (
              <span className="flex justify-end gap-2">
                <EditBankAccountButton bank={row} />
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={t('transferFromLabel', { name: row.name })}
                  onClick={() => {
                    setFrom(row.id);
                  }}
                >
                  {t('transfer')}
                </Button>
              </span>
            ),
          },
        ]}
      />
      {from !== null && (
        <TransferDialog
          fromAccountId={from}
          onClose={() => {
            setFrom(null);
          }}
        />
      )}
    </>
  );
}

const LINE_TONE: Readonly<Record<BankStatementLine['status'], Tone>> = {
  unmatched: 'warn',
  matched: 'good',
  posted: 'good',
};

function PostLineDialog({
  line,
  onClose,
}: {
  readonly line: BankStatementLine;
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('finance');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const accounts = useList(accounting.listAccounts, { limit: 200 });
  const [accountCode, setAccountCode] = useState('');
  const [description, setDescription] = useState(line.description);
  const post = useCommand(
    () =>
      browserCall(accounting.postStatementLine, {
        params: { id: line.id },
        body: { accountCode, description },
      }),
    {
      success: (result) => t('linePosted', { entry: result.journalEntryNo }),
      invalidate: [accounting.listStatementLines.id, accounting.getReconciliation.id],
      onSuccess: onClose,
    },
  );
  const options = accounts.items
    .filter(
      (account) => !account.isControl && (account.type === 'expense' || account.type === 'income'),
    )
    .filter((account) => !accounts.items.some((other) => other.parentId === account.id))
    .map((account) => ({ value: account.code, label: `${account.code} · ${account.name}` }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('postLine')}
      description={t('postLineDescription')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            loading={post.isPending}
            disabled={accountCode === '' || description.trim().length < 3}
            onClick={() => {
              post.mutate(undefined);
            }}
          >
            {t('postEntry')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {post.isError && <Callout tone="crit" title={message(post.error)} />}
        <p className="text-sm">
          {line.description} · <Money value={line.amount} />
        </p>
        <Field label={t('account')} required requiredLabel={common('required')}>
          {(control) => (
            <Select
              {...control}
              value={accountCode}
              placeholder={t('chooseAccount')}
              options={options}
              onChange={(event) => {
                setAccountCode(event.target.value);
              }}
            />
          )}
        </Field>
        <Field label={t('description')} required requiredLabel={common('required')}>
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
    </Dialog>
  );
}

export function ReconciliationTab(): ReactNode {
  const t = useTranslations('finance');
  const status = useTranslations('finance.lineStatus');
  const banks = useList(accounting.listBankAccounts, {});
  const [chosen, setChosen] = useState('');
  const bankId =
    chosen === '' ? (banks.items.find((bank) => bank.kind === 'bank')?.id ?? '') : chosen;
  const summary = useQuery({
    queryKey: [accounting.getReconciliation.id, bankId],
    queryFn: () => browserCall(accounting.getReconciliation, { params: { id: bankId }, query: {} }),
    enabled: bankId !== '',
  });
  // A suggestion names an entry by number; matching needs its id, from the journal list.
  const journals = useList(accounting.listJournalEntries, {});
  const [posting, setPosting] = useState<BankStatementLine | null>(null);
  const invalidate = [accounting.listStatementLines.id, accounting.getReconciliation.id];
  const match = useCommand(
    (line: BankStatementLine) =>
      browserCall(accounting.matchStatementLine, {
        params: { id: line.id },
        body: {
          journalEntryId:
            journals.items.find((entry) => entry.entryNo === line.suggestedEntryNo)?.id ?? '',
        },
      }),
    { success: (line) => t('lineMatched', { entry: line.matchedEntryNo ?? '' }), invalidate },
  );
  const unmatch = useCommand(
    (line: BankStatementLine) =>
      browserCall(accounting.unmatchStatementLine, { params: { id: line.id } }),
    { success: t('lineUnmatched'), invalidate },
  );
  const message = useErrorMessage();
  const error = match.error ?? unmatch.error;

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-sm">
        <Field label={t('bankAccount')}>
          {(control) => (
            <Select
              {...control}
              value={bankId}
              options={banks.items
                .filter((bank) => bank.kind === 'bank')
                .map((bank) => ({ value: bank.id, label: bank.name }))}
              onChange={(event) => {
                setChosen(event.target.value);
              }}
            />
          )}
        </Field>
      </div>
      {bankId !== '' && (
        <QueryView query={summary}>
          {(data) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiTile
                label={t('statementBalance')}
                value={<Money value={data.statementBalance} />}
              />
              <KpiTile label={t('ledgerBalance')} value={<Money value={data.ledgerBalance} />} />
              <KpiTile label={t('difference')} value={<Money value={data.difference} />} />
              <KpiTile
                label={t('unmatchedLines')}
                value={data.unmatchedLines}
                hint={t('asOf', { date: data.asOf })}
              />
            </div>
          )}
        </QueryView>
      )}
      {error !== null && <Callout tone="crit" title={message(error)} />}
      <LinesTable
        bankId={bankId}
        statusLabel={(value) => status(value)}
        onMatch={(line) => {
          match.mutate(line);
        }}
        onUnmatch={(line) => {
          unmatch.mutate(line);
        }}
        onPost={setPosting}
      />
      {posting !== null && (
        <PostLineDialog
          line={posting}
          onClose={() => {
            setPosting(null);
          }}
        />
      )}
    </div>
  );
}

function LinesTable({
  bankId,
  statusLabel,
  onMatch,
  onUnmatch,
  onPost,
}: {
  readonly bankId: string;
  readonly statusLabel: (status: BankStatementLine['status']) => string;
  readonly onMatch: (line: BankStatementLine) => void;
  readonly onUnmatch: (line: BankStatementLine) => void;
  readonly onPost: (line: BankStatementLine) => void;
}): ReactNode {
  const t = useTranslations('finance');
  const query = useQuery({
    queryKey: [accounting.listStatementLines.id, bankId],
    queryFn: () =>
      browserCall(accounting.listStatementLines, { params: { id: bankId }, query: {} }),
    enabled: bankId !== '',
  });
  return (
    <RecordTable
      label={t('statementLines')}
      empty={t('noStatementLines')}
      list={{
        items: query.data?.items ?? [],
        status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
        error: query.error,
        refetch: () => {
          void query.refetch();
        },
      }}
      getRowId={(row) => row.id}
      columns={[
        { id: 'date', header: t('date'), cell: (row) => <DateText value={row.date} /> },
        { id: 'description', header: t('statementLine'), cell: (row) => row.description },
        {
          id: 'amount',
          header: t('amount'),
          align: 'right',
          cell: (row) => <Money value={row.amount} />,
        },
        {
          id: 'suggestion',
          header: t('suggestion'),
          cell: (row) =>
            row.matchedEntryNo !== null ? (
              <Tag>{row.matchedEntryNo}</Tag>
            ) : row.suggestedEntryNo !== null ? (
              <span className="text-xs">{t('matches', { entry: row.suggestedEntryNo })}</span>
            ) : (
              <span className="text-xs text-muted">{t('noEntryYet')}</span>
            ),
        },
        {
          id: 'status',
          header: t('status'),
          cell: (row) => (
            <StatusPill tone={LINE_TONE[row.status]}>{statusLabel(row.status)}</StatusPill>
          ),
        },
        {
          id: 'actions',
          header: '',
          align: 'right',
          cell: (row) => (
            <span className="flex justify-end gap-2">
              {row.allowedActions.includes('match') && (
                <Button
                  size="sm"
                  onClick={() => {
                    onMatch(row);
                  }}
                >
                  {t('match')}
                </Button>
              )}
              {row.allowedActions.includes('post_charge') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onPost(row);
                  }}
                >
                  {t('postEntry')}
                </Button>
              )}
              {row.allowedActions.includes('unmatch') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onUnmatch(row);
                  }}
                >
                  {t('unmatch')}
                </Button>
              )}
            </span>
          ),
        },
      ]}
    />
  );
}

const CHEQUE_TONE: Readonly<Record<Cheque['status'], Tone>> = {
  issued: 'info',
  received: 'info',
  presented: 'warn',
  cleared: 'good',
  bounced: 'crit',
  cancelled: 'neutral',
};

export function ChequesTab(): ReactNode {
  const t = useTranslations('finance');
  const status = useTranslations('finance.chequeStatus');
  const cheques = useList(accounting.listCheques, {});
  return (
    <RecordTable
      label={t('cheques')}
      list={cheques}
      getRowId={(row) => row.id}
      toolbar={
        <div className="flex justify-end">
          <NewChequeButton />
        </div>
      }
      columns={[
        {
          id: 'no',
          header: t('chequeNo'),
          cell: (row) => <span className="font-mono">{row.chequeNo}</span>,
        },
        {
          id: 'direction',
          header: t('direction'),
          cell: (row) => (row.direction === 'issued' ? t('issued') : t('received')),
        },
        { id: 'party', header: t('party'), cell: (row) => row.partyName },
        { id: 'date', header: t('date'), cell: (row) => <DateText value={row.chequeDate} /> },
        {
          id: 'amount',
          header: t('amount'),
          align: 'right',
          cell: (row) => <Money value={row.amount} />,
        },
        {
          id: 'status',
          header: t('status'),
          cell: (row) => (
            <StatusPill tone={CHEQUE_TONE[row.status]}>{status(row.status)}</StatusPill>
          ),
        },
        {
          id: 'actions',
          header: '',
          align: 'right',
          cell: (row) => <ChequeStatusButton cheque={row} />,
        },
      ]}
    />
  );
}

const CLAIM_TONE: Readonly<Record<ExpenseClaim['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  approved: 'warn',
  paid: 'good',
  rejected: 'crit',
};

const ADVANCE_TONE: Readonly<Record<EmployeeAdvance['status'], Tone>> = {
  draft: 'neutral',
  pending_approval: 'info',
  paid: 'warn',
  settled: 'good',
  rejected: 'crit',
};

export function ClaimsTab(): ReactNode {
  const t = useTranslations('finance');
  const claimStatus = useTranslations('finance.claimStatus');
  const advanceStatus = useTranslations('finance.advanceStatus');
  const claims = useList(accounting.listExpenseClaims, {});
  const advances = useList(accounting.listEmployeeAdvances, {});
  return (
    <div className="flex flex-col gap-4">
      <RecordTable
        label={t('claims')}
        list={claims}
        getRowId={(row) => row.id}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t('claims')}</p>
            <span className="flex flex-wrap gap-2">
              <NewAdvanceButton />
              <NewClaimButton />
            </span>
          </div>
        }
        columns={[
          {
            id: 'number',
            header: t('claim'),
            cell: (row) => <Tag>{row.number ?? t('draft')}</Tag>,
          },
          { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
          { id: 'description', header: t('description'), cell: (row) => row.description },
          { id: 'date', header: t('date'), cell: (row) => <DateText value={row.expenseDate} /> },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill tone={CLAIM_TONE[row.status]}>{claimStatus(row.status)}</StatusPill>
            ),
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) => (
              <span className="flex justify-end gap-2">
                <SubmitClaimButton claim={row} />
                <PayClaimButton claim={row} />
              </span>
            ),
          },
        ]}
      />
      <RecordTable
        label={t('advances')}
        list={advances}
        getRowId={(row) => row.id}
        toolbar={<p className="text-sm font-semibold">{t('advances')}</p>}
        columns={[
          {
            id: 'number',
            header: t('advance'),
            cell: (row) => <Tag>{row.number ?? t('draft')}</Tag>,
          },
          { id: 'employee', header: t('employee'), cell: (row) => row.employee.name },
          { id: 'purpose', header: t('purpose'), cell: (row) => row.purpose },
          {
            id: 'amount',
            header: t('amount'),
            align: 'right',
            cell: (row) => <Money value={row.amount} />,
          },
          {
            id: 'outstanding',
            header: t('outstanding'),
            align: 'right',
            cell: (row) => <Money value={row.outstanding} />,
          },
          {
            id: 'status',
            header: t('status'),
            cell: (row) => (
              <StatusPill tone={ADVANCE_TONE[row.status]}>{advanceStatus(row.status)}</StatusPill>
            ),
          },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) => <AdvanceActions advance={row} />,
          },
        ]}
      />
    </div>
  );
}
