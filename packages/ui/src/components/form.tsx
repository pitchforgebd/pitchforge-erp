'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../lib/cn.ts';

const controlClass =
  'w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-faint disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted aria-invalid:border-crit';

export function Input({ className, ...props }: ComponentProps<'input'>): ReactNode {
  return <input className={cn(controlClass, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>): ReactNode {
  return <textarea className={cn(controlClass, 'min-h-24 py-2', className)} {...props} />;
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps extends Omit<ComponentProps<'select'>, 'children'> {
  readonly options: readonly SelectOption[];
  /** Shown as an empty first option. */
  readonly placeholder?: string;
}

/**
 * A styled native select: keyboard, screen reader and phone behaviour come from the browser,
 * and unlike a custom listbox it injects no <style> element, so it works with a strict CSP.
 */
export function Select({ options, placeholder, className, ...props }: SelectProps): ReactNode {
  return (
    <span className="relative block">
      <select className={cn(controlClass, 'h-10 appearance-none pr-9', className)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
}

export interface CheckboxProps extends ComponentProps<typeof CheckboxPrimitive.Root> {
  readonly label: ReactNode;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps): ReactNode {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <span className="inline-flex items-center gap-2">
      <CheckboxPrimitive.Root
        id={controlId}
        className={cn(
          'flex size-5 items-center justify-center rounded border border-line-strong bg-surface disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-ink',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden className="size-4" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={controlId} className="text-sm">
        {label}
      </label>
    </span>
  );
}

/** Spread onto the control inside a Field. */
export interface FieldControlProps {
  readonly id: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: true;
  readonly 'aria-required'?: true;
}

export interface FieldProps {
  readonly label: string;
  readonly hint?: string;
  /** Validation message; also marks the control invalid. */
  readonly error?: string;
  readonly required?: boolean;
  /** Shown for screen readers and sighted users next to a required label. */
  readonly requiredLabel?: string;
  readonly children: (control: FieldControlProps) => ReactNode;
}

/** Label, hint and error wired to one control, including for screen readers. */
export function Field({
  label,
  hint,
  error,
  required = false,
  requiredLabel,
  children,
}: FieldProps): ReactNode {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint === undefined ? null : hintId, error === undefined ? null : errorId]
    .filter((value) => value !== null)
    .join(' ');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
        {required && requiredLabel !== undefined && (
          <span className="ml-1 font-normal text-muted">({requiredLabel})</span>
        )}
      </label>
      {children({
        id,
        ...(describedBy !== '' && { 'aria-describedby': describedBy }),
        ...(error !== undefined && { 'aria-invalid': true }),
        ...(required && { 'aria-required': true }),
      })}
      {hint !== undefined && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} className="text-xs text-crit">
          {error}
        </p>
      )}
    </div>
  );
}
