import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { DateInput } from './date.tsx';
import { Checkbox, Field, Input, Select, Textarea } from './form.tsx';

const meta = {
  title: 'Components/Form',
  component: Field,
  parameters: { themes: 'both' },
  args: { label: 'Vendor', children: (control) => <Input {...control} /> },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'paid', label: 'Paid' },
];

export const TextInput: Story = {
  args: {
    label: 'Vendor',
    hint: 'As on the bill',
    children: (control) => <Input {...control} placeholder="CloudNest Hosting Ltd" />,
  },
};

export const Required: Story = {
  args: { label: 'Vendor', required: true, requiredLabel: 'required' },
};

export const WithError: Story = {
  args: {
    label: 'Net amount',
    error: 'Amount must be above zero',
    children: (control) => <Input {...control} defaultValue="0.00" />,
  },
  play: async ({ canvasElement }) => {
    const [input] = within(canvasElement).getAllByRole('textbox');
    if (input === undefined) throw new Error('no input');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('Amount must be above zero');
  },
};

export const DisabledInput: Story = {
  args: { label: 'Vendor', children: (control) => <Input {...control} disabled value="Locked" /> },
};

export const LongText: Story = {
  args: {
    label: 'Reason',
    hint: 'Shown to the requester',
    children: (control) => <Textarea {...control} />,
  },
};

export const SelectField: Story = {
  args: {
    label: 'Status',
    children: (control) => <Select {...control} options={STATUS_OPTIONS} placeholder="Any" />,
  },
};

export const Checkboxes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Checkbox label="Include paid bills" defaultChecked />
      <Checkbox label="Include drafts" />
      <Checkbox label="Locked option" disabled />
    </div>
  ),
};

function DateField({ initial }: { readonly initial: string | null }): ReactNode {
  const [value, setValue] = useState(initial);
  return (
    <Field label="Due date">
      {(control) => (
        <DateInput {...control} value={value} onChange={setValue} placeholder="Choose a date" />
      )}
    </Field>
  );
}

export const DateEmpty: Story = { render: () => <DateField initial={null} /> };

export const DateChosen: Story = {
  render: () => <DateField initial="2026-11-15" />,
  play: async ({ canvasElement }) => {
    const [trigger] = within(canvasElement).getAllByRole('button', { name: /Due date/ });
    await expect(trigger).toHaveTextContent('15 Nov 2026');
  },
};

export const DateDisabled: Story = {
  render: () => (
    <Field label="Due date">
      {(control) => (
        <DateInput
          {...control}
          disabled
          value="2026-11-15"
          onChange={() => undefined}
          placeholder="Choose a date"
        />
      )}
    </Field>
  ),
};

/** Single theme: the calendar opens in a portal on <body>. */
export const DatePick: Story = {
  parameters: { themes: 'one', theme: 'light' },
  render: () => <DateField initial="2026-11-15" />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: /Due date/ });
    await userEvent.click(trigger);
    const body = within(document.body);
    await userEvent.click(await body.findByRole('button', { name: /November 20th, 2026/ }));
    await expect(trigger).toHaveTextContent('20 Nov 2026');
  },
};
