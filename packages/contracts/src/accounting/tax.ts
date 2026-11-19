import { z } from 'zod';

import {
  DocumentNo,
  IsoDate,
  NonNegativeMoney,
  Rate,
  Uuid,
  YearMonth,
} from '../shared/primitives.ts';
import { AuditMeta } from '../shared/record.ts';

/** Tax rates are effective-dated configuration, never code (R7, TAX-09). */
export const TaxCode = z
  .object({
    id: Uuid,
    code: z.string(),
    name: z.string(),
    rate: Rate,
    validFrom: IsoDate,
    validTo: IsoDate.nullable(),
    meta: AuditMeta,
  })
  .meta({ id: 'TaxCode' });
export type TaxCode = z.infer<typeof TaxCode>;

export const CreateTaxCode = z
  .strictObject({
    code: z.string().trim().min(1).max(20),
    name: z.string().trim().min(2).max(120),
    rate: Rate,
    validFrom: IsoDate,
  })
  .meta({ id: 'CreateTaxCode' });
export type CreateTaxCode = z.infer<typeof CreateTaxCode>;

export const WithholdingKind = z.enum(['tds', 'vds']).meta({ id: 'WithholdingKind' });
export type WithholdingKind = z.infer<typeof WithholdingKind>;

export const WithholdingRule = z
  .object({
    id: Uuid,
    kind: WithholdingKind,
    category: z.string(),
    rate: Rate,
    /** Payments below this are not withheld. */
    threshold: NonNegativeMoney.nullable(),
    validFrom: IsoDate,
    validTo: IsoDate.nullable(),
    meta: AuditMeta,
  })
  .meta({ id: 'WithholdingRule' });
export type WithholdingRule = z.infer<typeof WithholdingRule>;

export const CreateWithholdingRule = z
  .strictObject({
    kind: WithholdingKind,
    category: z.string().trim().min(2).max(60),
    rate: Rate,
    threshold: NonNegativeMoney.nullable(),
    validFrom: IsoDate,
  })
  .meta({ id: 'CreateWithholdingRule' });
export type CreateWithholdingRule = z.infer<typeof CreateWithholdingRule>;

/** Output and input VAT for the monthly return, from the ledger (TAX-03). */
export const VatReturn = z
  .object({
    month: YearMonth,
    outputVat: NonNegativeMoney,
    inputVat: NonNegativeMoney,
    vdsDeducted: NonNegativeMoney,
    payable: NonNegativeMoney,
  })
  .meta({ id: 'VatReturn' });
export type VatReturn = z.infer<typeof VatReturn>;

export const WithholdingCertificate = z
  .object({
    id: Uuid,
    direction: z.enum(['issued', 'received']),
    kind: WithholdingKind,
    partyName: z.string(),
    period: YearMonth,
    amount: NonNegativeMoney,
    certificateNo: z.string(),
    fileId: Uuid.nullable(),
    meta: AuditMeta,
  })
  .meta({ id: 'WithholdingCertificate' });
export type WithholdingCertificate = z.infer<typeof WithholdingCertificate>;

export const CreateWithholdingCertificate = z
  .strictObject({
    direction: z.enum(['issued', 'received']),
    kind: WithholdingKind,
    partyName: z.string().trim().min(2).max(200),
    period: YearMonth,
    amount: NonNegativeMoney,
    certificateNo: z.string().trim().min(1).max(60),
    fileId: Uuid.nullable(),
  })
  .meta({ id: 'CreateWithholdingCertificate' });
export type CreateWithholdingCertificate = z.infer<typeof CreateWithholdingCertificate>;

/** A tax deposit to the treasury (TAX-07). */
export const Challan = z
  .object({
    id: Uuid,
    challanNo: z.string(),
    taxKind: z.enum(['vat', 'tds', 'vds', 'salary_tds']),
    period: YearMonth,
    amount: NonNegativeMoney,
    paidOn: IsoDate,
    journalEntryNo: DocumentNo.nullable(),
    meta: AuditMeta,
  })
  .meta({ id: 'Challan' });
export type Challan = z.infer<typeof Challan>;

export const CreateChallan = z
  .strictObject({
    challanNo: z.string().trim().min(1).max(60),
    taxKind: z.enum(['vat', 'tds', 'vds', 'salary_tds']),
    period: YearMonth,
    amount: NonNegativeMoney,
    paidOn: IsoDate,
  })
  .meta({ id: 'CreateChallan' });
export type CreateChallan = z.infer<typeof CreateChallan>;
