import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button, IconButton } from './button.tsx';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { themes: 'both' },
  args: { children: 'Approve and post', onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Button {...args} variant="primary" />
      <Button {...args} variant="secondary" />
      <Button {...args} variant="ghost" />
      <Button {...args} variant="danger" />
      <Button {...args} size="sm" />
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvasElement, args }) => {
    const [button] = within(canvasElement).getAllByRole('button');
    if (button === undefined) throw new Error('no button');
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const AsLink: Story = {
  render: () => (
    <Button asChild variant="secondary">
      <a href="#bills">Open bills</a>
    </Button>
  ),
};

export const KeyboardClick: Story = {
  play: async ({ canvasElement, args }) => {
    const [button] = within(canvasElement).getAllByRole('button');
    if (button === undefined) throw new Error('no button');
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Icon: Story = {
  render: () => <IconButton label="Add a bill" icon={<Plus aria-hidden className="size-4" />} />,
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button', { name: 'Add a bill' });
    await expect(buttons.length).toBeGreaterThan(0);
  },
};
