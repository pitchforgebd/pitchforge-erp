import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { DataTable } from './data-table.tsx';
import type { DataTableColumn, DataTableStatus } from './data-table.tsx';
import { DateText } from './date.tsx';
import { EmptyState, StatusPill, Tag } from './display.tsx';
import { Money } from './money.tsx';

interface Bill {
  readonly id: string;
  readonly number: string;
  readonly vendor: string;
  readonly due: string;
  readonly gross: string;
  readonly paid: boolean;
}

const BILLS: readonly Bill[] = [
  {
    id: '1',
    number: 'BILL-2627-00187',
    vendor: 'CloudNest Hosting Ltd',
    due: '2026-11-15',
    gross: '184000.00',
    paid: false,
  },
  {
    id: '2',
    number: 'BILL-2627-00185',
    vendor: 'Sheba Cabs',
    due: '2026-10-31',
    gross: '18400.00',
    paid: true,
  },
];

const COLUMNS: readonly DataTableColumn<Bill>[] = [
  { id: 'number', header: 'Bill', cell: (bill) => <Tag>{bill.number}</Tag> },
  { id: 'vendor', header: 'Vendor', cell: (bill) => bill.vendor },
  { id: 'due', header: 'Due', sortable: true, cell: (bill) => <DateText value={bill.due} /> },
  {
    id: 'gross',
    header: 'Amount',
    align: 'right',
    sortable: true,
    cell: (bill) => <Money value={{ amount: bill.gross, currency: 'BDT' }} />,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (bill) => (
      <StatusPill tone={bill.paid ? 'good' : 'warn'}>
        {bill.paid ? 'Paid' : 'Ready to pay'}
      </StatusPill>
    ),
  },
];

function BillTable({
  rows = BILLS,
  status,
}: {
  readonly rows?: readonly Bill[];
  readonly status?: DataTableStatus;
}): ReactNode {
  const [sort, setSort] = useState('due');
  return (
    <DataTable
      label="Vendor bills"
      columns={COLUMNS}
      rows={rows}
      getRowId={(bill) => bill.id}
      sort={sort}
      onSortChange={setSort}
      {...(status !== undefined && { status })}
      loadingState={<p className="p-4 text-sm text-muted">Loading bills…</p>}
      errorState={<EmptyState title="Could not load bills" description="Try again." />}
      emptyState={<EmptyState title="No bills yet" />}
    />
  );
}

const meta = {
  title: 'Components/DataTable',
  component: BillTable,
  parameters: { themes: 'both' },
} satisfies Meta<typeof BillTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rows: Story = {};
export const Loading: Story = { args: { status: 'loading' } };
export const Failed: Story = { args: { status: 'error' } };
export const Empty: Story = { args: { rows: [] } };

export const SortAsksTheServer: Story = {
  parameters: { themes: 'one', theme: 'light' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const due = canvas.getByRole('columnheader', { name: 'Due' });
    await expect(due).toHaveAttribute('aria-sort', 'ascending');

    await userEvent.click(within(due).getByRole('button'));
    await expect(due).toHaveAttribute('aria-sort', 'descending');

    const rows = canvas.getAllByRole('row');
    await expect(rows.at(1)).toHaveTextContent('BILL-2627-00187');
  },
};

export const ScrollsByKeyboard: Story = {
  parameters: { themes: 'one', theme: 'light' },
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByRole('group', { name: 'Vendor bills' });
    await expect(region).toHaveAttribute('tabindex', '0');
  },
};
