import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Button } from './button.tsx';
import { Dialog, Tabs, ToasterProvider, useToast } from './overlay.tsx';

function DialogDemo({ startOpen = true }: { readonly startOpen?: boolean }): ReactNode {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Review
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Approve this bill?"
        description="CloudNest Hosting Ltd, BILL-2627-00187"
        closeLabel="Close"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button>Approve and post</Button>
          </>
        }
      >
        <p className="text-sm">This posts a journal entry to October 2026.</p>
      </Dialog>
    </>
  );
}

const meta = {
  title: 'Components/Overlay',
  component: DialogDemo,
  parameters: { themes: 'one' },
} satisfies Meta<typeof DialogDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DialogLight: Story = {
  parameters: { theme: 'light' },
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog', {
      name: 'Approve this bill?',
    });
    await expect(dialog).toHaveAccessibleDescription('CloudNest Hosting Ltd, BILL-2627-00187');
  },
};

export const DialogDark: Story = { parameters: { theme: 'dark' } };

export const DialogClosesWithEscape: Story = {
  parameters: { theme: 'light' },
  args: { startOpen: false },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole('button', { name: 'Review' }));
    await body.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await expect(body.queryByRole('dialog')).toBeNull();
    // Focus returns to the button that opened it, so keyboard users keep their place.
    await expect(body.getByRole('button', { name: 'Review' })).toHaveFocus();
  },
};

const TAB_ITEMS = [
  { value: 'details', label: 'Details', content: <p className="text-sm">Bill details</p> },
  { value: 'activity', label: 'Activity', content: <p className="text-sm">Submitted today</p> },
];

export const TabsLight: Story = {
  parameters: { themes: 'both' },
  render: () => <Tabs label="Bill sections" items={TAB_ITEMS} />,
};

export const TabsByKeyboard: Story = {
  parameters: { theme: 'light' },
  render: () => <Tabs label="Bill sections" items={TAB_ITEMS} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Activity' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(canvas.getByText('Submitted today')).toBeVisible();
  },
};

function ToastButton(): ReactNode {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => {
          toast({ title: 'Posted as JE-2627-00413', tone: 'good' });
        }}
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          toast({
            title: 'This period is locked',
            description: 'Ask a Partner to reopen it.',
            tone: 'crit',
          });
        }}
      >
        Failure
      </Button>
    </div>
  );
}

function ToastDemo(): ReactNode {
  return (
    <ToasterProvider regionLabel="Notifications" closeLabel="Dismiss">
      <ToastButton />
    </ToasterProvider>
  );
}

export const Toasts: Story = {
  parameters: { theme: 'light' },
  render: () => <ToastDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Success' }));
    await expect(await canvas.findByText('Posted as JE-2627-00413')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(canvas.queryByText('Posted as JE-2627-00413')).toBeNull();
  },
};

export const ToastDark: Story = {
  parameters: { theme: 'dark' },
  render: () => <ToastDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Failure' }));
    await expect(await canvas.findByText('Ask a Partner to reopen it.')).toBeVisible();
  },
};
