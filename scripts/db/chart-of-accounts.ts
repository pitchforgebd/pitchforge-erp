/** Reads and checks the chart of accounts template (db/seeds/chart-of-accounts). */

export interface CsvAccount {
  readonly code: string;
  readonly name: string;
  readonly type: string;
  readonly normalBalance: string;
  readonly parentCode: string | null;
  readonly isContra: boolean;
  readonly isControl: boolean;
  readonly taxMapping: string | null;
}

const HEADER = 'code,name,type,normal_balance,parent_code,is_contra,is_control,tax_mapping';

/** The first digit of a code gives its type. */
const FIRST_DIGIT_OF_TYPE: Readonly<Record<string, readonly string[]>> = {
  asset: ['1'],
  liability: ['2'],
  equity: ['3'],
  income: ['4'],
  expense: ['5', '6'],
};

const NORMAL_BALANCE: Readonly<Record<string, string>> = {
  asset: 'debit',
  liability: 'credit',
  equity: 'credit',
  income: 'credit',
  expense: 'debit',
};

/** The tax reports need each of these on exactly one account. */
export const REQUIRED_TAX_MAPPINGS = [
  'ait_receivable',
  'input_vat',
  'output_vat',
  'tds_payable_salary',
  'tds_payable_vendor',
  'vds_payable',
  'vds_receivable',
] as const;

/** AR, AP and payroll payable: the `Account` contract names these as control accounts. */
export const REQUIRED_CONTROL_ACCOUNTS = ['1210', '2110', '2210'] as const;

export function parseChart(csv: string): CsvAccount[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (header !== HEADER) throw new Error(`Unexpected header: ${header ?? ''}`);
  return rows.map((row, index) => {
    const cells = row.split(',');
    const [code, name, type, normalBalance, parentCode, isContra, isControl, taxMapping] = cells;
    if (
      cells.length !== 8 ||
      code === undefined ||
      name === undefined ||
      type === undefined ||
      normalBalance === undefined
    ) {
      throw new Error(`Row ${String(index + 2)} needs 8 columns: ${row}`);
    }
    return {
      code,
      name,
      type,
      normalBalance,
      parentCode: parentCode === '' || parentCode === undefined ? null : parentCode,
      isContra: isContra === 'true',
      isControl: isControl === 'true',
      taxMapping: taxMapping === '' || taxMapping === undefined ? null : taxMapping,
    };
  });
}

function structureProblems(accounts: readonly CsvAccount[]): string[] {
  const problems: string[] = [];
  const byCode = new Map(accounts.map((account) => [account.code, account]));
  const seen = new Set<string>();

  for (const account of accounts) {
    const { code, parentCode, type } = account;
    if (seen.has(code)) problems.push(`${code}: duplicate code`);
    seen.add(code);
    if (!/^[0-9]{4}$/.test(code)) problems.push(`${code}: a code has 4 digits`);

    const digits = new Map(Object.entries(FIRST_DIGIT_OF_TYPE)).get(type);
    if (digits === undefined) problems.push(`${code}: unknown type ${type}`);
    else if (!digits.includes(code.charAt(0))) problems.push(`${code}: code does not fit ${type}`);

    if (parentCode === null) continue;
    const parent = byCode.get(parentCode);
    if (parent === undefined) problems.push(`${code}: parent ${parentCode} does not exist`);
    else if (parent.type !== type) problems.push(`${code}: parent has another type`);
  }
  return problems;
}

function balanceProblems(accounts: readonly CsvAccount[]): string[] {
  const parents = new Set(accounts.map((account) => account.parentCode));
  const problems: string[] = [];

  for (const { code, type, normalBalance, isContra, isControl } of accounts) {
    const expected = new Map(Object.entries(NORMAL_BALANCE)).get(type);
    if (expected === undefined) continue;
    if ((normalBalance === expected) === isContra) {
      problems.push(
        `${code}: normal balance ${normalBalance} does not fit its type and contra flag`,
      );
    }
    if (isControl && parents.has(code))
      problems.push(`${code}: a heading cannot be a control account`);
  }
  return problems;
}

function requiredProblems(accounts: readonly CsvAccount[]): string[] {
  const problems: string[] = [];
  const types = new Set(accounts.map((account) => account.type));
  for (const type of Object.keys(FIRST_DIGIT_OF_TYPE)) {
    if (!types.has(type)) problems.push(`no ${type} accounts`);
    const roots = accounts.filter((a) => a.type === type && a.parentCode === null);
    if (type !== 'expense' && roots.length > 1)
      problems.push(`${type} has more than one top account`);
  }
  for (const code of REQUIRED_CONTROL_ACCOUNTS) {
    if (accounts.find((a) => a.code === code)?.isControl !== true) {
      problems.push(`${code} must be a control account`);
    }
  }
  for (const mapping of REQUIRED_TAX_MAPPINGS) {
    const holders = accounts.filter((a) => a.taxMapping === mapping);
    if (holders.length !== 1) problems.push(`tax mapping ${mapping} needs exactly one account`);
    if (holders.some((a) => !a.isControl)) problems.push(`${mapping} must be a control account`);
  }
  return problems;
}

/** Everything wrong with a chart; empty when it is valid. */
export function chartProblems(accounts: readonly CsvAccount[]): string[] {
  return [
    ...structureProblems(accounts),
    ...balanceProblems(accounts),
    ...requiredProblems(accounts),
  ];
}
