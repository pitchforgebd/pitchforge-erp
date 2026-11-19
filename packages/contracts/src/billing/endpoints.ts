import { z } from 'zod';

import { AgeingReport, PartyStatement } from '../accounting/payables.ts';
import { command, createOne, getOne, listOf, updateOne } from '../endpoint-helpers.ts';
import { IdParams, defineEndpoints } from '../endpoint.ts';
import { IsoDate, Uuid } from '../shared/primitives.ts';

import {
  CreateCreditNote,
  CreateReceipt,
  CreateSalesInvoice,
  CreditNote,
  CreditNoteStatus,
  InvoiceStatus,
  Receipt,
  SalesInvoice,
  UpdateSalesInvoice,
} from './schemas.ts';

const BILLING = '/api/v1/billing';
const POSTING_ERRORS = ['PERIOD_LOCKED', 'NOT_BALANCED', 'INVALID_STATE'] as const;

export const billingEndpoints = defineEndpoints('billing', {
  listInvoices: listOf(`${BILLING}/invoices`, 'Sales invoices', ['BIL-01'], SalesInvoice, {
    status: InvoiceStatus.optional(),
    clientId: Uuid.optional(),
    projectId: Uuid.optional(),
  }),
  getInvoice: getOne(
    `${BILLING}/invoices/{id}`,
    'One invoice; the Mushak layout comes from documents:render',
    ['BIL-01', 'BIL-02'],
    SalesInvoice,
  ),
  createInvoice: createOne(
    `${BILLING}/invoices`,
    'Draft an invoice from a milestone, plan, timesheet or by hand',
    ['BIL-01', 'BIL-03', 'TAX-01'],
    CreateSalesInvoice,
    SalesInvoice,
  ),
  updateInvoice: updateOne(
    `${BILLING}/invoices/{id}`,
    'Change a draft invoice',
    ['BIL-01', 'BIL-03'],
    UpdateSalesInvoice,
    SalesInvoice,
  ),
  postInvoice: {
    ...command(
      `${BILLING}/invoices/{id}:post`,
      'Number the invoice and post it to the ledger',
      ['BIL-01', 'TAX-01'],
      SalesInvoice,
    ),
    movesMoney: true,
    errors: [...POSTING_ERRORS],
  },
  sendInvoiceReminder: {
    ...command(
      `${BILLING}/invoices/{id}:send-reminder`,
      'Email a collection reminder',
      ['BIL-08'],
      SalesInvoice,
    ),
    versioned: false,
    sendsMessages: true,
  },

  listReceipts: listOf(`${BILLING}/receipts`, 'Receipts', ['BIL-04'], Receipt, {
    clientId: Uuid.optional(),
  }),
  getReceipt: getOne(`${BILLING}/receipts/{id}`, 'One receipt', ['BIL-04', 'BIL-05'], Receipt),
  createReceipt: createOne(
    `${BILLING}/receipts`,
    'Draft a receipt against one or many invoices, with AIT, VDS and retention',
    ['BIL-04', 'BIL-05', 'TAX-05'],
    CreateReceipt,
    Receipt,
  ),
  postReceipt: {
    ...command(
      `${BILLING}/receipts/{id}:post`,
      'Post a receipt to the ledger',
      ['BIL-04', 'BIL-05', 'TAX-05'],
      Receipt,
    ),
    movesMoney: true,
    errors: [...POSTING_ERRORS],
  },

  listCreditNotes: listOf(
    `${BILLING}/credit-notes`,
    'Credit notes and write-offs',
    ['BIL-06'],
    CreditNote,
    {
      status: CreditNoteStatus.optional(),
    },
  ),
  getCreditNote: getOne(`${BILLING}/credit-notes/{id}`, 'One credit note', ['BIL-06'], CreditNote),
  createCreditNote: createOne(
    `${BILLING}/credit-notes`,
    'Draft a credit note or write-off',
    ['BIL-06'],
    CreateCreditNote,
    CreditNote,
  ),
  submitCreditNote: command(
    `${BILLING}/credit-notes/{id}:submit`,
    'Send for approval through core approvals',
    ['BIL-06'],
    CreditNote,
  ),

  getReceivablesAgeing: {
    method: 'GET',
    path: `${BILLING}/receivables-ageing`,
    summary: 'Receivables ageing: not due, 1–30 … 90+',
    featureIds: ['BIL-07'],
    query: z.strictObject({ asOf: IsoDate.optional() }),
    response: AgeingReport,
  },
  getClientStatement: {
    method: 'GET',
    path: `${BILLING}/client-statements/{id}`,
    summary: 'Client statement for a date range; the PDF comes from documents:render',
    featureIds: ['BIL-10'],
    params: IdParams,
    query: z.strictObject({ from: IsoDate, to: IsoDate }),
    response: PartyStatement,
  },
});
