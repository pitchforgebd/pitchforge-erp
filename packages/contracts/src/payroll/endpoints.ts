import { z } from 'zod';

import { Job } from '../core/platform.ts';
import { command, createOne, getOne, listOf } from '../endpoint-helpers.ts';
import { defineEndpoints } from '../endpoint.ts';
import { Uuid, YearMonth } from '../shared/primitives.ts';

import {
  CreateFinalSettlement,
  CreatePayrollRun,
  CreateSalaryLoan,
  CreateSalaryStructureVersion,
  FinalSettlement,
  FinalSettlementStatus,
  PayrollRun,
  PayrollRunStatus,
  Payslip,
  SalaryLoan,
  SalaryLoanStatus,
  SalarySheetRow,
  SalaryStructure,
  SubmitTaxDeclaration,
  TaxCertificate,
  TaxDeclaration,
} from './schemas.ts';

const PAY = '/api/v1/payroll';

export const payrollEndpoints = defineEndpoints('payroll', {
  listSalaryStructures: listOf(
    `${PAY}/salary-structures`,
    'Salary structures; amounts are omitted without field permission',
    ['PAY-01'],
    SalaryStructure,
    { employeeId: Uuid.optional() },
  ),
  createSalaryStructureVersion: {
    ...createOne(
      `${PAY}/salary-structures`,
      'Add an effective-dated salary structure',
      ['PAY-01'],
      CreateSalaryStructureVersion,
      SalaryStructure,
    ),
    stepUp: true,
  },

  listPayrollRuns: listOf(`${PAY}/payroll-runs`, 'Payroll and bonus runs', ['PAY-02'], PayrollRun, {
    status: PayrollRunStatus.optional(),
    month: YearMonth.optional(),
  }),
  getPayrollRun: getOne(`${PAY}/payroll-runs/{id}`, 'One run', ['PAY-02', 'PAY-03'], PayrollRun),
  startPayrollRun: {
    ...createOne(
      `${PAY}/payroll-runs`,
      'Calculate a monthly or festival bonus run from attendance and leave',
      ['PAY-02', 'PAY-04', 'PAY-05'],
      CreatePayrollRun,
      PayrollRun,
    ),
    status: 202,
    errors: ['INVALID_STATE'],
  },
  submitPayrollRun: command(
    `${PAY}/payroll-runs/{id}:submit`,
    'Send for approval through core approvals',
    ['PAY-03'],
    PayrollRun,
  ),
  lockPayrollRun: {
    ...command(
      `${PAY}/payroll-runs/{id}:lock`,
      'Lock an approved run and post it, split by project through timesheets',
      ['PAY-03', 'PAY-15', 'TAX-08'],
      PayrollRun,
    ),
    movesMoney: true,
    stepUp: true,
    errors: ['PERIOD_LOCKED', 'NOT_BALANCED', 'INVALID_STATE'],
  },
  getSalarySheet: getOne(
    `${PAY}/payroll-runs/{id}/salary-sheet`,
    'Salary sheet of one run',
    ['PAY-04', 'PAY-11'],
    z.object({ items: z.array(SalarySheetRow) }),
  ),
  exportBankFile: {
    ...command(
      `${PAY}/payroll-runs/{id}:export-bank-file`,
      'Generate the bank salary file; the export is logged',
      ['PAY-12'],
      Job,
    ),
    versioned: false,
    stepUp: true,
    status: 202,
    errors: ['INVALID_STATE', 'RATE_LIMITED'],
  },

  listPayslips: listOf(
    `${PAY}/payslips`,
    'Payslips: an employee sees only their own',
    ['PAY-10', 'UX-01'],
    Payslip,
    { employeeId: Uuid.optional(), month: YearMonth.optional() },
  ),
  getPayslip: getOne(
    `${PAY}/payslips/{id}`,
    'One payslip; the PDF comes from documents:render',
    ['PAY-10', 'UX-01'],
    Payslip,
  ),

  getMyTaxDeclaration: {
    method: 'GET',
    path: `${PAY}/tax-declarations`,
    summary: 'Own salary tax projection and declaration for the fiscal year',
    featureIds: ['PAY-08'],
    query: z.strictObject({ fiscalYearCode: z.string().regex(/^[0-9]{4}$/) }),
    response: TaxDeclaration,
  },
  submitTaxDeclaration: createOne(
    `${PAY}/tax-declarations`,
    'Declare investments; the server recalculates monthly TDS',
    ['PAY-08', 'TAX-08'],
    SubmitTaxDeclaration,
    TaxDeclaration,
  ),

  listSalaryLoans: listOf(
    `${PAY}/salary-loans`,
    'Salary advances and loans',
    ['PAY-09'],
    SalaryLoan,
    {
      status: SalaryLoanStatus.optional(),
      employeeId: Uuid.optional(),
    },
  ),
  createSalaryLoan: createOne(
    `${PAY}/salary-loans`,
    'Draft an advance or loan',
    ['PAY-09'],
    CreateSalaryLoan,
    SalaryLoan,
  ),
  submitSalaryLoan: command(
    `${PAY}/salary-loans/{id}:submit`,
    'Send for approval through core approvals',
    ['PAY-09'],
    SalaryLoan,
  ),

  listFinalSettlements: listOf(
    `${PAY}/final-settlements`,
    'Final settlements of leavers',
    ['PAY-16'],
    FinalSettlement,
    { status: FinalSettlementStatus.optional() },
  ),
  getFinalSettlement: getOne(
    `${PAY}/final-settlements/{id}`,
    'One final settlement',
    ['PAY-16'],
    FinalSettlement,
  ),
  createFinalSettlement: createOne(
    `${PAY}/final-settlements`,
    'Calculate a final settlement',
    ['PAY-16'],
    CreateFinalSettlement,
    FinalSettlement,
  ),
  submitFinalSettlement: command(
    `${PAY}/final-settlements/{id}:submit`,
    'Send for approval through core approvals',
    ['PAY-16'],
    FinalSettlement,
  ),

  listTaxCertificates: listOf(
    `${PAY}/tax-certificates`,
    'Yearly tax certificates',
    ['PAY-14'],
    TaxCertificate,
    { employeeId: Uuid.optional(), fiscalYearCode: z.string().max(4).optional() },
  ),
});
