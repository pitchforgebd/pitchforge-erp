'use client';

import { CalendarDays } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { DayPicker } from 'react-day-picker';

import {
  businessDate,
  dateParts,
  formatDate,
  parseBusinessDate,
  unwrap,
} from '@pitchforge/shared-kernel';

import { cn } from '../lib/cn.ts';

import type { FieldControlProps } from './form.tsx';

export interface DateTextProps {
  /** A business date, YYYY-MM-DD. */
  readonly value: string;
  readonly className?: string;
}

/** A date in the product's display format: 04 Nov 2026. */
export function DateText({ value, className }: DateTextProps): ReactNode {
  return (
    <time dateTime={value} className={cn('whitespace-nowrap', className)}>
      {formatDate(unwrap(parseBusinessDate(value)))}
    </time>
  );
}

/** Calendar day for the picker; a business date has no zone, so local parts are exact. */
function toPickerDate(value: string): Date {
  const { year, month, day } = dateParts(unwrap(parseBusinessDate(value)));
  return new Date(year, month - 1, day);
}

export interface DateInputProps extends Partial<FieldControlProps> {
  /** A business date, YYYY-MM-DD, or null. */
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly placeholder: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  ...control
}: DateInputProps): ReactNode {
  const [open, setOpen] = useState(false);
  const selected = value === null ? undefined : toPickerDate(value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-control border border-line-strong bg-surface px-3 text-left text-sm disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted aria-invalid:border-crit',
          className,
        )}
        {...control}
      >
        <span className={value === null ? 'text-muted' : 'text-fg'}>
          {value === null ? placeholder : formatDate(unwrap(parseBusinessDate(value)))}
        </span>
        <CalendarDays aria-hidden className="size-4 text-muted" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 rounded-card border border-line bg-surface p-3 text-fg shadow-raised"
        >
          <DayPicker
            mode="single"
            {...(selected !== undefined && { selected, defaultMonth: selected })}
            onSelect={(day: Date | undefined) => {
              onChange(
                day === undefined
                  ? null
                  : businessDate(day.getFullYear(), day.getMonth() + 1, day.getDate()),
              );
              setOpen(false);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
