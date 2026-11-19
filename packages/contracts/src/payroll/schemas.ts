import { z } from 'zod';

import {
  DocumentNo,
  IsoDate,
  Money,
  NonNegativeMoney,
  PositiveMoney,
  Timestamp,
  Uuid,
  YearMonth,
} from '../shared/primitives.ts';
import { AuditMeta, PersonRef, allowedActions, restricted } from '../shared/record.ts';

/*
 * Every amount tied to a person is restricted to Partner, HR and the employee themself
 * (access-control-matrix.md). The API omits it for anyone else.
 */

const SalaryComponent = z
  .strictObject({ name: z.string().trim().min(2).max(60), amount: NonNegativeMoney })
  .meta({ id: 'SalaryComponent' });

export const SalaryStructure = z
  .object({
    id: Uuid,
    employee: PersonRef.nullable(),
    grade: z.string().nullable(),
    basicSalary: restricted(NonNegativeMoney, 'salary'),
    allowances: restricted(z.array(SalaryComponent), 'salary'),
    grossSalary: restricted(NonNegativeMoney, 'salary'),
    validFrom: IsoDate,
    validTo: IsoDate.nullable(),
    meta: AuditMeta,
  })
  .meta({ id: 'SalaryStructure' });
export type SalaryStructure = z.infer<typeof SalaryStructure>;

/** Per grade or per person; a change adds an effective-dated version (R7). */
export const CreateSalaryStructureVersion = z
  .strictObject({
    employeeId: Uuid.nullable(),
    grade: z.string().trim().max(20).nullable(),
    basicSalary: NonNegativeMoney,
    allowances: z.array(SalaryComponent).max(30),
    validFrom: IsoDate,
  })
  .meta({ id: 'CreateSalaryStructureVersion' });
export type CreateSalaryStructureVersion = z.infer<typeof CreateSalaryStructureVersion>;

export const PayrollRunStatus = z
  .enum(['calculating', 'draft', 'pending_approval', 'approved', 'locked', 'rejected'])
  .meta({ id: 'PayrollRunStatus' });
export type PayrollRunStatus = z.infer<typeof PayrollRunStatus>;

export const PayrollRun = z
  .object({
    id: Uuid,
    number: DocumentNo.nullable(),
    kind: z.enum(['monthly', 'festival_bonus']),
    month: YearMonth,
    headcount: z.number().int().min(0),
    /** Run totals are shown to payroll users; they reveal no one person's pay. */
    gross: NonNegativeMoney,
    tax: NonNegativeMoney,
    providentFund: NonNegativeMoney,
    net: NonNegativeMoney,
    status: PayrollRunStatus,
    approvalId: Uuid.nullable(),
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['submit', 'lock', 'export_bank_file']),
    meta: AuditMeta,
  })
  .meta({ id: 'PayrollRun' });
export type PayrollRun = z.infer<typeof PayrollRun>;

export const CreatePayrollRun = z
  .strictObject({ kind: z.enum(['monthly', 'festival_bonus']), month: YearMonth })
  .meta({ id: 'CreatePayrollRun' });
export type CreatePayrollRun = z.infer<typeof CreatePayrollRun>;

/** One row of the salary sheet, with overtime worked out by the server (PAY-04, PAY-11). */
export const SalarySheetRow = z
  .object({
    employee: PersonRef,
    daysWorked: z.string(),
    overtimePay: restricted(NonNegativeMoney, 'salary'),
    grossPay: restricted(NonNegativeMoney, 'salary'),
    taxDeducted: restricted(NonNegativeMoney, 'salary'),
    netPay: restricted(NonNegativeMoney, 'salary'),
  })
  .meta({ id: 'SalarySheetRow' });
export type SalarySheetRow = z.infer<typeof SalarySheetRow>;

export const PayslipLine = z
  .object({ label: z.string(), kind: z.enum(['earning', 'deduction']), amount: NonNegativeMoney })
  .meta({ id: 'PayslipLine' });
export type PayslipLine = z.infer<typeof PayslipLine>;

export const Payslip = z
  .object({
    id: Uuid,
    payrollRunId: Uuid,
    employee: PersonRef,
    month: YearMonth,
    lines: restricted(z.array(PayslipLine), 'salary'),
    grossPay: restricted(NonNegativeMoney, 'salary'),
    netPay: restricted(NonNegativeMoney, 'salary'),
    issuedAt: Timestamp.nullable(),
  })
  .meta({ id: 'Payslip' });
export type Payslip = z.infer<typeof Payslip>;

export const TaxDeclaration = z
  .object({
    id: Uuid,
    employee: PersonRef,
    fiscalYearCode: z.string(),
    /** Projection worked out by the server (PAY-08). */
    projectedAnnualTax: restricted(NonNegativeMoney, 'salary'),
    monthlyTds: restricted(NonNegativeMoney, 'salary'),
    investments: restricted(NonNegativeMoney, 'salary'),
    meta: AuditMeta,
  })
  .meta({ id: 'TaxDeclaration' });
export type TaxDeclaration = z.infer<typeof TaxDeclaration>;

export const SubmitTaxDeclaration = z
  .strictObject({
    fiscalYearCode: z.string().regex(/^[0-9]{4}$/),
    investments: NonNegativeMoney,
  })
  .meta({ id: 'SubmitTaxDeclaration' });
export type SubmitTaxDeclaration = z.infer<typeof SubmitTaxDeclaration>;

export const SalaryLoanStatus = z
  .enum(['draft', 'pending_approval', 'active', 'settled', 'rejected'])
  .meta({ id: 'SalaryLoanStatus' });
export type SalaryLoanStatus = z.infer<typeof SalaryLoanStatus>;

export const SalaryLoan = z
  .object({
    id: Uuid,
    employee: PersonRef,
    kind: z.enum(['advance', 'loan']),
    principal: restricted(PositiveMoney, 'salary'),
    monthlyDeduction: restricted(NonNegativeMoney, 'salary'),
    outstanding: restricted(NonNegativeMoney, 'salary'),
    status: SalaryLoanStatus,
    approvalId: Uuid.nullable(),
    allowedActions: allowedActions(['submit']),
    meta: AuditMeta,
  })
  .meta({ id: 'SalaryLoan' });
export type SalaryLoan = z.infer<typeof SalaryLoan>;

export const CreateSalaryLoan = z
  .strictObject({
    employeeId: Uuid,
    kind: z.enum(['advance', 'loan']),
    principal: PositiveMoney,
    monthlyDeduction: NonNegativeMoney,
  })
  .meta({ id: 'CreateSalaryLoan' });
export type CreateSalaryLoan = z.infer<typeof CreateSalaryLoan>;

export const FinalSettlementStatus = z
  .enum(['draft', 'pending_approval', 'approved', 'paid', 'rejected'])
  .meta({ id: 'FinalSettlementStatus' });
export type FinalSettlementStatus = z.infer<typeof FinalSettlementStatus>;

export const FinalSettlement = z
  .object({
    id: Uuid,
    employee: PersonRef,
    lastWorkingDay: IsoDate,
    lines: restricted(z.array(PayslipLine), 'salary'),
    netPay: restricted(Money, 'salary'),
    status: FinalSettlementStatus,
    approvalId: Uuid.nullable(),
    journalEntryNo: DocumentNo.nullable(),
    allowedActions: allowedActions(['submit']),
    meta: AuditMeta,
  })
  .meta({ id: 'FinalSettlement' });
export type FinalSettlement = z.infer<typeof FinalSettlement>;

export const CreateFinalSettlement = z
  .strictObject({ employeeId: Uuid, lastWorkingDay: IsoDate })
  .meta({ id: 'CreateFinalSettlement' });
export type CreateFinalSettlement = z.infer<typeof CreateFinalSettlement>;

/** A yearly tax certificate for one employee (PAY-14). */
export const TaxCertificate = z
  .object({
    id: Uuid,
    employee: PersonRef,
    fiscalYearCode: z.string(),
    fileId: Uuid,
    issuedAt: Timestamp,
  })
  .meta({ id: 'TaxCertificate' });
export type TaxCertificate = z.infer<typeof TaxCertificate>;
