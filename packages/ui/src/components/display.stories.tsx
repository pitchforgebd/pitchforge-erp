import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Button } from './button.tsx';
import { DateText } from './date.tsx';
import { Callout, EmptyState, KpiTile, StatusPill, Steps, Tag } from './display.tsx';
import type { Step } from './display.tsx';
import { Money } from './money.tsx';

const meta = {
  title: 'Components/Display',
  component: StatusPill,
  parameters: { themes: 'both' },
  args: { tone: 'good', children: 'Paid' },
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatusPills: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusPill tone="neutral">Draft</StatusPill>
      <StatusPill tone="info">Pending approval</StatusPill>
      <StatusPill tone="warn">Ready to pay</StatusPill>
      <StatusPill tone="good">Paid</StatusPill>
      <StatusPill tone="crit">Rejected</StatusPill>
    </div>
  ),
};

export const Tags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag>BILL-2627-00187</Tag>
      <Tag>PF-2603</Tag>
    </div>
  ),
};

const bdt = (amount: string) => ({ amount, currency: 'BDT' });

export const MoneyFormats: Story = {
  render: () => (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>Whole taka</dt>
      <dd>
        <Money value={bdt('125000.00')} />
      </dd>
      <dt>With paisa</dt>
      <dd>
        <Money value={bdt('125000.50')} />
      </dd>
      <dt>Ledger column</dt>
      <dd>
        <Money value={bdt('125000.00')} decimals="always" />
      </dd>
      <dt>Crore</dt>
      <dd>
        <Money value={bdt('12500000.00')} />
      </dd>
      <dt>Negative</dt>
      <dd>
        <Money value={bdt('-45000.00')} />
      </dd>
      <dt>Accounting style</dt>
      <dd>
        <Money value={bdt('-45000.00')} negative="parentheses" />
      </dd>
      <dt>International</dt>
      <dd>
        <Money value={bdt('125000.00')} grouping="international" />
      </dd>
      <dt>Another currency</dt>
      <dd>
        <Money value={{ amount: '1234.56', currency: 'USD' }} />
      </dd>
    </dl>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('৳1,25,000').length).toBeGreaterThan(0);
    await expect(canvas.getAllByText('৳1,25,00,000').length).toBeGreaterThan(0);
    await expect(canvas.getAllByText('(৳45,000)').length).toBeGreaterThan(0);
  },
};

export const Dates: Story = {
  render: () => <DateText value="2026-11-04" />,
  play: async ({ canvasElement }) => {
    const [date] = within(canvasElement).getAllByText('04 Nov 2026');
    await expect(date).toHaveAttribute('datetime', '2026-11-04');
  },
};

export const Kpi: Story = {
  render: () => (
    <div className="grid gap-3 sm:grid-cols-2">
      <KpiTile
        label="Cash position"
        value={<Money value={bdt('2500000.00')} />}
        hint="All accounts"
      />
      <KpiTile label="Awaiting approval" value="7" />
    </div>
  ),
};

const STEPS: readonly Step[] = [
  { id: '1', label: 'Rafiq Islam', detail: 'Submitted 04 Nov 2026, 14:30', state: 'done' },
  { id: '2', label: 'Farhana Kabir', detail: 'Approver', state: 'current' },
  { id: '3', label: 'Finance', state: 'waiting' },
];

const STATE_LABELS = {
  done: 'Done',
  current: 'Waiting for this step',
  waiting: 'Not started',
  rejected: 'Rejected',
};

export const ApprovalChain: Story = {
  render: () => <Steps label="Approval steps" steps={STEPS} stateLabels={STATE_LABELS} />,
  play: async ({ canvasElement }) => {
    const [list] = within(canvasElement).getAllByRole('list', { name: 'Approval steps' });
    if (list === undefined) throw new Error('no list');
    await expect(list.querySelector('[aria-current="step"]')).toHaveTextContent('Farhana Kabir');
  },
};

export const ApprovalRejected: Story = {
  render: () => (
    <Steps
      label="Approval steps"
      stateLabels={STATE_LABELS}
      steps={[
        { id: '1', label: 'Rafiq Islam', state: 'done' },
        { id: '2', label: 'Farhana Kabir', detail: 'Wrong project', state: 'rejected' },
      ]}
    />
  ),
};

export const Callouts: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Callout tone="info" title="Posting preview">
        This bill will post to Cloud hosting.
      </Callout>
      <Callout tone="good" title="Posted as JE-2627-00413" />
      <Callout tone="warn" title="Above the withdrawable balance">
        All other partners must approve this drawing.
      </Callout>
      <Callout tone="crit" title="This period is locked">
        Ask a Partner to reopen October 2026.
      </Callout>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <EmptyState
      title="No bills waiting"
      description="Bills appear here once they are submitted."
      action={<Button variant="secondary">Add a bill</Button>}
    />
  ),
};
