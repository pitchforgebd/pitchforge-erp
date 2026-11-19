import { accountingEndpoints as accounting } from '@pitchforge/contracts';
import type { ManualJournal } from '@pitchforge/contracts';

import {
  BANK,
  BILL_POSTINGS,
  CLOSE_CHECKLIST,
  DRAFT_BILL_ID,
  EXCHANGE_RATES,
  LOCKED_PERIOD_DRAFT_ID,
  PAYABLES_AGEING,
  PAYEES,
  PAYEE_PAYMENTS,
  PAYEE_STATEMENT,
  POSTING_RULES,
  RECONCILIATION,
  REVERSALS,
  REVERSED_ENTRY_ID,
  TAX_CODES,
  TRANSFERS,
  UNBALANCED_DRAFT_ID,
  WITHHOLDING_RULES,
  accountsFor,
  advancesFor,
  bankAccountsFor,
  billsFor,
  chequesFor,
  claimsFor,
  journalsFor,
  manualJournalsFor,
  paymentRunsFor,
  periodId,
  periodsFor,
  statementLinesFor,
} from '../data/accounting-records.ts';
import { rid } from '../data/core-records.ts';
import { mock } from '../define.ts';
import type { MockHandler, MockReply, MockRequest } from '../define.ts';
import { idOf, parentIdOf, serveList, serveOne, serveValue, viewerOf } from '../serve.ts';
import type { Viewer } from '../serve.ts';
import { STEP_UP_COOKIE } from '../session.ts';

/** The roles that work in finance; anyone else is refused, as the API would. */
const FINANCE_ROLES = new Set<Viewer['role']>(['partner', 'finance']);

function command(request: MockRequest, reply: (viewer: Viewer) => MockReply): MockReply {
  const viewer = viewerOf(request);
  if (viewer === undefined) return { problem: 'UNAUTHENTICATED' };
  if (!FINANCE_ROLES.has(viewer.role)) return { problem: 'FORBIDDEN' };
  return reply(viewer);
}

/** A command answered from a row the viewer can see; the action must be one it allows. */
function act<T extends { readonly id: string; readonly allowedActions: readonly string[] }>(
  request: MockRequest,
  rows: (viewer: Viewer) => readonly T[],
  action: string,
  outcome: (row: T, viewer: Viewer) => MockReply,
): MockReply {
  return command(request, (viewer) => {
    const row = rows(viewer).find((candidate) => candidate.id === idOf(request));
    if (row === undefined) return { problem: 'NOT_FOUND' };
    if (!row.allowedActions.includes(action)) return { problem: 'INVALID_STATE' };
    return outcome(row, viewer);
  });
}

const financeOnly =
  <T>(rows: (viewer: Viewer, request: MockRequest) => readonly T[]) =>
  (viewer: Viewer, request: MockRequest) =>
    FINANCE_ROLES.has(viewer.role) ? rows(viewer, request) : [];

function draftJournal(id: string, body: unknown): ManualJournal {
  const input = body as Pick<ManualJournal, 'entryDate' | 'description' | 'lines' | 'fileIds'>;
  return {
    id,
    number: null,
    entryDate: input.entryDate,
    description: input.description,
    status: 'draft',
    approvalId: null,
    lines: input.lines,
    journalEntryNo: null,
    fileIds: input.fileIds,
    allowedActions: ['update', 'submit', 'delete'],
    meta: {
      createdAt: '2026-11-04T05:00:00Z',
      createdBy: rid(1),
      updatedAt: '2026-11-04T05:00:00Z',
      updatedBy: rid(1),
      version: 1,
    },
  };
}

export const accountingRecordHandlers: readonly MockHandler[] = [
  /* Ledger */
  serveList(
    accounting.listAccounts,
    financeOnly((viewer) => accountsFor(viewer.role)),
  ),
  serveOne(
    accounting.getAccount,
    financeOnly((viewer) => accountsFor(viewer.role)),
  ),
  serveList(
    accounting.listFiscalPeriods,
    financeOnly((viewer) => periodsFor(viewer.role)),
  ),
  mock(accounting.lockFiscalPeriod, (request) =>
    act(
      request,
      (viewer) => periodsFor(viewer.role),
      'lock',
      (period) => ({
        json: {
          ...period,
          status: 'locked',
          lockedAt: '2026-11-04T05:00:00Z',
          lockedBy: { id: rid(1), name: 'Rafiq Islam' },
          allowedActions: [],
        },
      }),
    ),
  ),
  mock(accounting.reopenFiscalPeriod, (request) =>
    act(
      request,
      (viewer) => periodsFor(viewer.role),
      'reopen',
      (period) =>
        request.cookie(STEP_UP_COOKIE) === undefined
          ? { problem: 'STEP_UP_REQUIRED' }
          : {
              json: {
                ...period,
                status: 'open',
                lockedAt: null,
                lockedBy: null,
                allowedActions: ['lock'],
              },
            },
    ),
  ),
  serveValue(accounting.getCloseChecklist, (viewer, request) =>
    FINANCE_ROLES.has(viewer.role) && parentIdOf(request) === CLOSE_CHECKLIST.periodId
      ? CLOSE_CHECKLIST
      : undefined,
  ),
  serveList(
    accounting.listJournalEntries,
    financeOnly((viewer) => journalsFor(viewer.role)),
  ),
  serveOne(
    accounting.getJournalEntry,
    financeOnly((viewer) => journalsFor(viewer.role)),
  ),
  mock(accounting.reverseJournalEntry, (request) =>
    command(request, (viewer) => {
      const id = idOf(request);
      if (id === REVERSED_ENTRY_ID) return { problem: 'ALREADY_REVERSED' };
      const original = journalsFor(viewer.role).find((item) => item.id === id);
      if (original === undefined) return { problem: 'NOT_FOUND' };
      if (original.periodId === periodId(3)) return { problem: 'PERIOD_LOCKED' };
      const reversal = REVERSALS.get(original.id);
      if (reversal === undefined) return { problem: 'INVALID_STATE' };
      return {
        json: {
          original: {
            ...original,
            status: 'reversed',
            reversedById: reversal.id,
            allowedActions: [],
          },
          reversal,
        },
      };
    }),
  ),
  serveList(
    accounting.listManualJournals,
    financeOnly((viewer) => manualJournalsFor(viewer.role)),
  ),
  serveOne(
    accounting.getManualJournal,
    financeOnly((viewer) => manualJournalsFor(viewer.role)),
  ),
  mock(accounting.createManualJournal, async (request) => {
    const viewer = viewerOf(request);
    if (viewer === undefined) return { problem: 'UNAUTHENTICATED' };
    if (viewer.role !== 'finance') return { problem: 'FORBIDDEN' };
    // The draft is the request echoed back: nothing in it is worked out here.
    return { json: draftJournal(rid(3699), await request.request.json()) };
  }),
  mock(accounting.submitManualJournal, (request) =>
    command(request, (viewer) => {
      const id = idOf(request);
      if (id === UNBALANCED_DRAFT_ID) return { problem: 'NOT_BALANCED' };
      if (id === LOCKED_PERIOD_DRAFT_ID) return { problem: 'PERIOD_LOCKED' };
      const known = manualJournalsFor(viewer.role).find((item) => item.id === id);
      if (known !== undefined && known.status !== 'draft') return { problem: 'INVALID_STATE' };
      const base = known ?? manualJournalsFor(viewer.role)[0];
      if (base === undefined) return { problem: 'NOT_FOUND' };
      return {
        json: {
          ...base,
          id,
          number: 'JV-2627-00022',
          status: 'pending_approval',
          approvalId: rid(1102),
          allowedActions: [],
        },
      };
    }),
  ),
  serveList(
    accounting.listPostingRules,
    financeOnly(() => POSTING_RULES),
  ),
  serveList(
    accounting.listExchangeRates,
    financeOnly(() => EXCHANGE_RATES),
  ),
  serveList(
    accounting.listTaxCodes,
    financeOnly(() => TAX_CODES),
  ),
  serveList(
    accounting.listWithholdingRules,
    financeOnly(() => WITHHOLDING_RULES),
  ),

  /* Payables */
  serveList(
    accounting.listVendorBills,
    financeOnly((viewer) => billsFor(viewer.role)),
  ),
  serveOne(
    accounting.getVendorBill,
    financeOnly((viewer) => billsFor(viewer.role)),
  ),
  serveValue(accounting.getVendorBillPostingPreview, (viewer, request) =>
    FINANCE_ROLES.has(viewer.role) ? BILL_POSTINGS.get(parentIdOf(request)) : undefined,
  ),
  mock(accounting.createVendorBill, (request) =>
    command(request, (viewer) => ({
      json: billsFor(viewer.role).find((bill) => bill.id === DRAFT_BILL_ID),
    })),
  ),
  mock(accounting.submitVendorBill, (request) =>
    act(
      request,
      (viewer) => billsFor(viewer.role),
      'submit',
      (bill) => ({
        json: {
          ...bill,
          number: 'BILL-2627-00190',
          status: 'pending_approval',
          approvalId: rid(1101),
          allowedActions: [],
        },
      }),
    ),
  ),
  serveList(
    accounting.listPaymentRuns,
    financeOnly((viewer) => paymentRunsFor(viewer.role)),
  ),
  serveOne(
    accounting.getPaymentRun,
    financeOnly((viewer) => paymentRunsFor(viewer.role)),
  ),
  mock(accounting.createPaymentRun, (request) =>
    command(request, (viewer) => ({ json: paymentRunsFor(viewer.role)[0] })),
  ),
  mock(accounting.submitPaymentRun, (request) =>
    act(
      request,
      (viewer) => paymentRunsFor(viewer.role),
      'submit',
      (run) => ({
        json: { ...run, status: 'pending_approval', approvalId: rid(1110), allowedActions: [] },
      }),
    ),
  ),
  mock(accounting.exportBankAdvice, (request) =>
    act(
      request,
      (viewer) => paymentRunsFor(viewer.role),
      'export_advice',
      () => ({
        json: {
          id: rid(4901),
          kind: 'bank_advice',
          status: 'succeeded',
          progressPercent: 100,
          resultFileId: rid(4902),
          errorCode: null,
          createdAt: '2026-11-04T05:00:00Z',
          finishedAt: '2026-11-04T05:00:02Z',
        },
      }),
    ),
  ),
  serveList(
    accounting.listPayees,
    financeOnly(() => PAYEES),
  ),
  serveList(
    accounting.listPayeePayments,
    financeOnly((_viewer, request) => PAYEE_PAYMENTS.get(parentIdOf(request)) ?? []),
  ),
  serveValue(accounting.getPayeeStatement, (viewer, request) =>
    FINANCE_ROLES.has(viewer.role) && parentIdOf(request) === PAYEE_STATEMENT.partyId
      ? PAYEE_STATEMENT
      : undefined,
  ),
  serveValue(accounting.getPayablesAgeing, (viewer) =>
    FINANCE_ROLES.has(viewer.role) ? PAYABLES_AGEING : undefined,
  ),

  /* Claims and advances: employees see their own. */
  serveList(accounting.listExpenseClaims, (viewer) => claimsFor(viewer.role, viewer.userId)),
  serveOne(accounting.getExpenseClaim, (viewer) => claimsFor(viewer.role, viewer.userId)),
  serveList(
    accounting.listEmployeeAdvances,
    financeOnly((viewer) => advancesFor(viewer.role)),
  ),

  /* Bank */
  serveList(
    accounting.listBankAccounts,
    financeOnly((viewer) => bankAccountsFor(viewer.role)),
  ),
  serveOne(
    accounting.getBankAccount,
    financeOnly((viewer) => bankAccountsFor(viewer.role)),
  ),
  serveList(
    accounting.listTransfers,
    financeOnly(() => TRANSFERS),
  ),
  serveList(
    accounting.listStatementLines,
    financeOnly((viewer, request) =>
      parentIdOf(request) === BANK.city ? statementLinesFor(viewer.role) : [],
    ),
  ),
  serveValue(accounting.getReconciliation, (viewer, request) =>
    FINANCE_ROLES.has(viewer.role) && parentIdOf(request) === BANK.city
      ? RECONCILIATION
      : undefined,
  ),
  mock(accounting.matchStatementLine, (request) =>
    act(
      request,
      (viewer) => statementLinesFor(viewer.role),
      'match',
      (line) => ({
        json: {
          ...line,
          status: 'matched',
          matchedEntryNo: line.suggestedEntryNo,
          allowedActions: ['unmatch'],
        },
      }),
    ),
  ),
  mock(accounting.unmatchStatementLine, (request) =>
    act(
      request,
      (viewer) => statementLinesFor(viewer.role),
      'unmatch',
      (line) => ({
        json: { ...line, status: 'unmatched', matchedEntryNo: null, allowedActions: ['match'] },
      }),
    ),
  ),
  mock(accounting.postStatementLine, (request) =>
    act(
      request,
      (viewer) => statementLinesFor(viewer.role),
      'post_charge',
      (line) => ({
        json: {
          line: { ...line, status: 'posted', matchedEntryNo: 'JE-2627-00415', allowedActions: [] },
          journalEntryNo: 'JE-2627-00415',
        },
      }),
    ),
  ),
  serveList(
    accounting.listCheques,
    financeOnly((viewer) => chequesFor(viewer.role)),
  ),
];
