import { payrollEndpoints as pay } from '@pitchforge/contracts';

import { bdt, rid } from '../data/core-records.ts';
import { STAFF, employeesFor } from '../data/hr-records.ts';
import {
  CLOSED_MONTHS,
  DECLARED,
  NOVEMBER_RUN_ID,
  SALARY_SHEET,
  STARTED_RUN,
  finalSettlementsFor,
  payrollRunsFor,
  payslipsFor,
  readsPayroll,
  runsPayroll,
  salaryLoansFor,
  salaryStructuresFor,
  taxCertificatesFor,
  taxDeclarationOf,
} from '../data/payroll-records.ts';
import type { MockHandler } from '../define.ts';
import {
  actOn,
  bodyOf,
  parentIdOf,
  serveList,
  serveOne,
  serveValue,
  steppedUp,
  withViewerAsync,
} from '../serve.ts';
import type { Viewer } from '../serve.ts';

const runs = (viewer: Viewer) => payrollRunsFor(viewer.role);
const payslips = (viewer: Viewer) => payslipsFor(viewer.role, viewer.userId);
const loans = (viewer: Viewer) => salaryLoansFor(viewer.role, viewer.userId);
const settlements = (viewer: Viewer) => finalSettlementsFor(viewer.role, viewer.userId);

const CREATED = {
  createdAt: '2026-11-20T05:00:00Z',
  createdBy: STAFF.farhana.id,
  updatedAt: '2026-11-20T05:00:00Z',
  updatedBy: STAFF.farhana.id,
  version: 1,
};

const selfOf = (viewer: Viewer) =>
  employeesFor('partner').find((row) => row.userId === viewer.userId);

export const payrollRecordHandlers: readonly MockHandler[] = [
  serveList(pay.listSalaryStructures, (viewer) => salaryStructuresFor(viewer.role, viewer.userId)),
  withViewerAsync(pay.createSalaryStructureVersion, async (viewer, request) => {
    if (!runsPayroll(viewer.role)) return { problem: 'FORBIDDEN' };
    if (!steppedUp(request)) return { problem: 'STEP_UP_REQUIRED' };
    const body = await bodyOf(request);
    const person = employeesFor('partner').find((row) => row.id === body['employeeId']);
    return {
      json: {
        id: rid(8799),
        employee: person === undefined ? null : { id: person.id, name: person.name },
        grade: body['grade'],
        basicSalary: body['basicSalary'],
        allowances: body['allowances'],
        // The server adds the components up; the sample answers with a fixed gross.
        grossSalary: bdt('98000.00'),
        validFrom: body['validFrom'],
        validTo: null,
        meta: CREATED,
      },
    };
  }),

  serveList(pay.listPayrollRuns, runs),
  serveOne(pay.getPayrollRun, runs),
  withViewerAsync(pay.startPayrollRun, async (viewer, request) => {
    if (!runsPayroll(viewer.role)) return { problem: 'FORBIDDEN' };
    const body = await bodyOf(request);
    const month = String(body['month']);
    // A run needs the month's attendance closed; a monthly run exists once per month.
    if (!CLOSED_MONTHS.has(month) || body['kind'] === 'monthly')
      return { problem: 'INVALID_STATE' };
    return { json: { ...STARTED_RUN, kind: body['kind'], month } };
  }),
  actOn(pay.submitPayrollRun, runs, 'submit', (row) => ({
    json: { ...row, status: 'pending_approval', allowedActions: [] },
  })),
  actOn(
    pay.lockPayrollRun,
    runs,
    'lock',
    (row) => ({
      json: {
        ...row,
        status: 'locked',
        journalEntryNo: 'JE-2627-00463',
        allowedActions: ['export_bank_file'],
      },
    }),
    { stepUp: true },
  ),
  serveValue(pay.getSalarySheet, (viewer, request) =>
    readsPayroll(viewer.role) && runs(viewer).some((row) => row.id === parentIdOf(request))
      ? { items: SALARY_SHEET }
      : undefined,
  ),
  actOn(
    pay.exportBankFile,
    runs,
    'export_bank_file',
    () => ({
      json: {
        id: rid(8990),
        kind: 'payroll.bank_file',
        status: 'queued',
        progressPercent: 0,
        resultFileId: null,
        errorCode: null,
        createdAt: '2026-11-20T05:00:00Z',
        finishedAt: null,
      },
    }),
    { stepUp: true },
  ),

  serveList(pay.listPayslips, payslips),
  serveOne(pay.getPayslip, payslips),
  withViewerAsync(pay.getMyTaxDeclaration, (viewer, request) => {
    const self = selfOf(viewer);
    const year = new URL(request.request.url).searchParams.get('fiscalYearCode') ?? '';
    if (!/^[0-9]{4}$/.test(year)) return { problem: 'VALIDATION' };
    const declaration =
      self === undefined ? undefined : taxDeclarationOf({ id: self.id, name: self.name }, year);
    // Partners are not employees, so they have no salary tax declaration here.
    return declaration === undefined ? { problem: 'FORBIDDEN' } : { json: declaration };
  }),
  withViewerAsync(pay.submitTaxDeclaration, async (viewer, request) => {
    const self = selfOf(viewer);
    const answer = self === undefined ? undefined : DECLARED.get(self.id);
    if (self === undefined || answer === undefined) return { problem: 'FORBIDDEN' };
    const body = await bodyOf(request);
    const [projected, monthly] = answer;
    return {
      json: {
        id: rid(8850),
        employee: { id: self.id, name: self.name },
        fiscalYearCode: body['fiscalYearCode'],
        projectedAnnualTax: bdt(projected),
        monthlyTds: bdt(monthly),
        investments: body['investments'],
        meta: CREATED,
      },
    };
  }),

  serveList(pay.listSalaryLoans, loans),
  withViewerAsync(pay.createSalaryLoan, async (viewer, request) => {
    if (!runsPayroll(viewer.role)) return { problem: 'FORBIDDEN' };
    const body = await bodyOf(request);
    const person = employeesFor('partner').find((row) => row.id === body['employeeId']);
    if (person === undefined) return { problem: 'VALIDATION' };
    return {
      json: {
        id: rid(8909),
        employee: { id: person.id, name: person.name },
        kind: body['kind'],
        principal: body['principal'],
        monthlyDeduction: body['monthlyDeduction'],
        outstanding: body['principal'],
        status: 'draft',
        approvalId: null,
        allowedActions: ['submit'],
        meta: CREATED,
      },
    };
  }),
  actOn(pay.submitSalaryLoan, loans, 'submit', (row) => ({
    json: { ...row, status: 'pending_approval', approvalId: rid(8964), allowedActions: [] },
  })),

  serveList(pay.listFinalSettlements, settlements),
  serveOne(pay.getFinalSettlement, settlements),
  withViewerAsync(pay.createFinalSettlement, async (viewer, request) => {
    if (!runsPayroll(viewer.role)) return { problem: 'FORBIDDEN' };
    const body = await bodyOf(request);
    // Only a leaver has a settlement; the server's answer for Rumana is her existing draft.
    const draft = settlements(viewer).find(
      (row) => row.employee.id === body['employeeId'] && row.status === 'draft',
    );
    return draft === undefined ? { problem: 'VALIDATION' } : { json: draft };
  }),
  actOn(pay.submitFinalSettlement, settlements, 'submit', (row) => ({
    json: { ...row, status: 'pending_approval', approvalId: rid(8965), allowedActions: [] },
  })),

  serveList(pay.listTaxCertificates, (viewer) => taxCertificatesFor(viewer.role, viewer.userId)),
];

/** The run a partner can lock in the samples. */
export const LOCKABLE_RUN_ID = NOVEMBER_RUN_ID;
