import {
  accountingEndpoints as accounting,
  billingEndpoints as billing,
  partnersEndpoints as partners,
} from '@pitchforge/contracts';

import {
  CHALLANS,
  CLIENT_STATEMENT,
  EMPTY_VAT_RETURN,
  DISTRIBUTION_PREVIEW,
  EQUITY_VERSIONS,
  PARTNER_STATEMENT,
  RECEIVABLES_AGEING,
  TOO_LARGE_DRAWING_ID,
  VAT_RETURNS,
  WITHDRAWABLE,
  WITHHOLDING_CERTIFICATES,
  creditNotesFor,
  distributionRunsFor,
  invoicesFor,
  partnerTransactionsFor,
  partnersFor,
  receiptsFor,
} from '../data/billing-records.ts';
import { rid } from '../data/core-records.ts';
import { mock } from '../define.ts';
import type { MockHandler, MockReply, MockRequest } from '../define.ts';
import { idOf, parentIdOf, serveList, serveOne, serveValue, viewerOf } from '../serve.ts';
import type { Viewer } from '../serve.ts';
import { STEP_UP_COOKIE } from '../session.ts';

const MONEY_ROLES = new Set<Viewer['role']>(['partner', 'finance']);

const moneyOnly =
  <T>(rows: (viewer: Viewer, request: MockRequest) => readonly T[]) =>
  (viewer: Viewer, request: MockRequest) =>
    MONEY_ROLES.has(viewer.role) ? rows(viewer, request) : [];

function command(
  request: MockRequest,
  reply: (viewer: Viewer) => MockReply | Promise<MockReply>,
): MockReply | Promise<MockReply> {
  const viewer = viewerOf(request);
  if (viewer === undefined) return { problem: 'UNAUTHENTICATED' };
  if (!MONEY_ROLES.has(viewer.role)) return { problem: 'FORBIDDEN' };
  return reply(viewer);
}

function act<T extends { readonly id: string; readonly allowedActions: readonly string[] }>(
  request: MockRequest,
  rows: (viewer: Viewer) => readonly T[],
  action: string,
  outcome: (row: T, viewer: Viewer) => MockReply,
): MockReply | Promise<MockReply> {
  return command(request, (viewer) => {
    const row = rows(viewer).find((candidate) => candidate.id === idOf(request));
    if (row === undefined) return { problem: 'NOT_FOUND' };
    if (!row.allowedActions.includes(action)) return { problem: 'INVALID_STATE' };
    return outcome(row, viewer);
  });
}

const steppedUp = (request: MockRequest) => request.cookie(STEP_UP_COOKIE) !== undefined;

export const billingRecordHandlers: readonly MockHandler[] = [
  /* Invoices, receipts, credit notes */
  serveList(
    billing.listInvoices,
    moneyOnly((viewer) => invoicesFor(viewer.role)),
  ),
  serveOne(
    billing.getInvoice,
    moneyOnly((viewer) => invoicesFor(viewer.role)),
  ),
  mock(billing.postInvoice, (request) =>
    act(
      request,
      (viewer) => invoicesFor(viewer.role),
      'post',
      (invoice) => ({
        json: {
          ...invoice,
          number: 'INV-2627-00051',
          status: 'posted',
          journalEntryNo: 'JE-2627-00416',
          allowedActions: ['send_reminder'],
        },
      }),
    ),
  ),
  mock(billing.sendInvoiceReminder, (request) =>
    act(
      request,
      (viewer) => invoicesFor(viewer.role),
      'send_reminder',
      (invoice) => ({ json: invoice }),
    ),
  ),
  serveList(
    billing.listReceipts,
    moneyOnly((viewer) => receiptsFor(viewer.role)),
  ),
  serveOne(
    billing.getReceipt,
    moneyOnly((viewer) => receiptsFor(viewer.role)),
  ),
  mock(billing.createReceipt, (request) =>
    command(request, (viewer) => ({ json: receiptsFor(viewer.role)[1] })),
  ),
  mock(billing.postReceipt, (request) =>
    act(
      request,
      (viewer) => receiptsFor(viewer.role),
      'post',
      (receipt) => ({
        json: {
          ...receipt,
          number: 'RCP-2627-00099',
          status: 'posted',
          journalEntryNo: 'JE-2627-00417',
          allowedActions: [],
        },
      }),
    ),
  ),
  serveList(
    billing.listCreditNotes,
    moneyOnly((viewer) => creditNotesFor(viewer.role)),
  ),
  serveOne(
    billing.getCreditNote,
    moneyOnly((viewer) => creditNotesFor(viewer.role)),
  ),
  mock(billing.submitCreditNote, (request) =>
    act(
      request,
      (viewer) => creditNotesFor(viewer.role),
      'submit',
      (note) => ({
        json: { ...note, status: 'pending_approval', approvalId: rid(1112), allowedActions: [] },
      }),
    ),
  ),
  serveValue(billing.getReceivablesAgeing, (viewer) =>
    MONEY_ROLES.has(viewer.role) ? RECEIVABLES_AGEING : undefined,
  ),
  serveValue(billing.getClientStatement, (viewer, request) =>
    MONEY_ROLES.has(viewer.role) && idOf(request) === CLIENT_STATEMENT.partyId
      ? CLIENT_STATEMENT
      : undefined,
  ),

  /* Tax */
  mock(accounting.getVatReturn, (request) =>
    command(request, () => {
      const month = new URL(request.request.url).searchParams.get('month') ?? '';
      if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) return { problem: 'VALIDATION' };
      // A month with nothing filed yet answers with zeros, as the server would.
      return { json: VAT_RETURNS.get(month) ?? { ...EMPTY_VAT_RETURN, month } };
    }),
  ),
  serveList(
    accounting.listWithholdingCertificates,
    moneyOnly(() => WITHHOLDING_CERTIFICATES),
  ),
  serveList(
    accounting.listChallans,
    moneyOnly(() => CHALLANS),
  ),

  /* Partners */
  serveList(
    partners.listPartners,
    moneyOnly((viewer) => partnersFor(viewer.role)),
  ),
  serveOne(
    partners.getPartner,
    moneyOnly((viewer) => partnersFor(viewer.role)),
  ),
  serveValue(partners.getWithdrawableBalance, (viewer, request) =>
    MONEY_ROLES.has(viewer.role) ? WITHDRAWABLE.get(parentIdOf(request)) : undefined,
  ),
  serveValue(partners.getPartnerStatement, (viewer, request) =>
    MONEY_ROLES.has(viewer.role) && parentIdOf(request) === PARTNER_STATEMENT.partyId
      ? PARTNER_STATEMENT
      : undefined,
  ),
  serveList(
    partners.listEquityVersions,
    moneyOnly(() => EQUITY_VERSIONS),
  ),
  serveList(
    partners.listPartnerTransactions,
    moneyOnly((viewer) => partnerTransactionsFor(viewer.role, viewer.userId)),
  ),
  serveOne(
    partners.getPartnerTransaction,
    moneyOnly((viewer) => partnerTransactionsFor(viewer.role, viewer.userId)),
  ),
  mock(partners.submitPartnerTransaction, (request) =>
    act(
      request,
      (viewer) => partnerTransactionsFor(viewer.role, viewer.userId),
      'submit',
      (transaction) => {
        if (!steppedUp(request)) return { problem: 'STEP_UP_REQUIRED' };
        if (transaction.id === TOO_LARGE_DRAWING_ID) {
          return { problem: 'INSUFFICIENT_WITHDRAWABLE_BALANCE' };
        }
        return {
          json: {
            ...transaction,
            number: 'DRW-2627-00010',
            status: 'pending_approval',
            approvalId: rid(1113),
            allowedActions: [],
          },
        };
      },
    ),
  ),
  serveList(
    partners.listDistributionRuns,
    moneyOnly((viewer) => distributionRunsFor(viewer.role)),
  ),
  serveOne(
    partners.getDistributionRun,
    moneyOnly((viewer) => distributionRunsFor(viewer.role)),
  ),
  mock(partners.previewDistributionRun, (request) =>
    command(request, (viewer) =>
      viewer.role === 'partner' ? { json: DISTRIBUTION_PREVIEW } : { problem: 'FORBIDDEN' },
    ),
  ),
  mock(partners.postDistributionRun, (request) =>
    command(request, (viewer) => {
      if (viewer.role !== 'partner') return { problem: 'FORBIDDEN' };
      if (idOf(request) !== DISTRIBUTION_PREVIEW.id) return { problem: 'INVALID_STATE' };
      if (!steppedUp(request)) return { problem: 'STEP_UP_REQUIRED' };
      return {
        json: {
          ...DISTRIBUTION_PREVIEW,
          number: 'DIST-2627-00003',
          status: 'posted',
          journalEntryNo: 'JE-2627-00418',
          allowedActions: ['reverse'],
        },
      };
    }),
  ),
];
