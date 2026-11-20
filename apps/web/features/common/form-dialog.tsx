'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { z } from 'zod';

import { fromDhakaWallClock, parseBusinessDate, toDhakaWallClock } from '@pitchforge/shared-kernel';
import {
  Button,
  Callout,
  Checkbox,
  DateInput,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
} from '@pitchforge/ui';
import type { SelectOption } from '@pitchforge/ui';

import { useErrorMessage } from './errors.ts';
import { fieldErrors } from './form-errors.ts';
import { moneyFromInput } from './money-input.ts';
import { useCommand } from './step-up.tsx';

/**
 * One form for every create and edit screen. The fields are listed by the screen; the body is
 * checked with the contract's own schema before it is sent, so the rules live in one place and
 * the server checks them again. The form only reshapes what people type: it never works out an
 * amount, a total or a permission.
 */

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'money'
  | 'date'
  | 'month'
  | 'select'
  | 'integer'
  | 'decimal'
  | 'checkbox'
  /** Typed in Dhaka time, sent as a UTC timestamp. */
  | 'datetime'
  /** Not shown; kept so an edit sends it back, e.g. the id of an existing row. */
  | 'hidden';

export interface FieldSpec {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly options?: readonly SelectOption[];
  /** An empty value is sent as null rather than as an empty string. */
  readonly nullable?: boolean;
  readonly required?: boolean;
  readonly hint?: string;
}

export interface LinesSpec {
  readonly name: string;
  readonly label: string;
  readonly kind: 'lines';
  readonly fields: readonly FieldSpec[];
  readonly addLabel: string;
  readonly minRows?: number;
}

export type FormSpec = FieldSpec | LinesSpec;

type Scalar = string | boolean;
type Row = ReadonlyMap<string, Scalar>;
type Value = Scalar | readonly Row[];
export type FormValues = ReadonlyMap<string, Value>;

/** Starting values, as people would type them: amounts as "1,25,000", dates as YYYY-MM-DD. */
export type Initial = Readonly<
  Record<string, Scalar | readonly Readonly<Record<string, Scalar>>[]>
>;

function emptyRow(fields: readonly FieldSpec[]): Row {
  return new Map(fields.map((field) => [field.name, field.kind === 'checkbox' ? false : '']));
}

function startValues(specs: readonly FormSpec[], initial: Initial): FormValues {
  const given = new Map(Object.entries(initial));
  return new Map(
    specs.map((spec): [string, Value] => {
      const value = given.get(spec.name);
      if (spec.kind === 'lines') {
        const rows = Array.isArray(value)
          ? (value as readonly Readonly<Record<string, Scalar>>[]).map(
              (row): Row => new Map(Object.entries(row)),
            )
          : Array.from({ length: spec.minRows ?? 1 }, () => emptyRow(spec.fields));
        return [spec.name, rows];
      }
      if (value === undefined || Array.isArray(value)) {
        return [spec.name, spec.kind === 'checkbox' ? false : ''];
      }
      return [spec.name, value as Scalar];
    }),
  );
}

/** A stored UTC timestamp as the Dhaka "YYYY-MM-DDTHH:MM" a datetime field shows. */
export function dhakaInput(timestamp: string | null): string {
  if (timestamp === null) return '';
  const { date, time } = toDhakaWallClock(new Date(timestamp));
  return `${date}T${time}`;
}

/** What one field sends: reshaped only, never calculated. */
function wireValue(spec: FieldSpec, raw: Scalar | undefined): unknown {
  if (spec.kind === 'checkbox') return raw === true;
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text === '' && spec.nullable === true) return null;
  if (spec.kind === 'money') return moneyFromInput(text) ?? { amount: text, currency: 'BDT' };
  if (spec.kind === 'integer') return /^-?[0-9]+$/.test(text) ? Number.parseInt(text, 10) : text;
  if (spec.kind === 'decimal') return text.replaceAll(',', '');
  if (spec.kind === 'datetime') {
    const [date = '', time = ''] = text.split('T');
    const parsed = parseBusinessDate(date);
    return (parsed.ok ? fromDhakaWallClock(parsed.value, time)?.toISOString() : undefined) ?? text;
  }
  return text;
}

export function bodyOf(
  specs: readonly FormSpec[],
  values: FormValues,
  fixed: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  const entries = specs.map((spec): [string, unknown] => {
    const value = values.get(spec.name);
    if (spec.kind === 'lines') {
      const rows = Array.isArray(value) ? (value as readonly Row[]) : [];
      return [
        spec.name,
        rows.map((row) =>
          Object.fromEntries(
            spec.fields.map((field) => [field.name, wireValue(field, row.get(field.name))]),
          ),
        ),
      ];
    }
    return [spec.name, wireValue(spec, value as Scalar | undefined)];
  });
  return { ...Object.fromEntries(entries), ...fixed };
}

/** The first message for a field, including nested paths such as "amount.amount". */
function errorOf(errors: ReadonlyMap<string, string>, path: string): { error?: string } {
  for (const [key, message] of errors) {
    if (key === path || key.startsWith(`${path}.`)) return { error: message };
  }
  return {};
}

function Control({
  spec,
  value,
  onChange,
  label,
  error,
}: {
  readonly spec: FieldSpec;
  readonly value: Scalar | undefined;
  readonly onChange: (value: Scalar) => void;
  readonly label: string;
  readonly error: { error?: string };
}): ReactNode {
  const t = useTranslations('forms');
  const common = useTranslations('common');
  const text = typeof value === 'string' ? value : '';
  if (spec.kind === 'hidden') return null;
  if (spec.kind === 'checkbox') {
    return (
      <Checkbox
        label={label}
        checked={value === true}
        onCheckedChange={(checked) => {
          onChange(checked === true);
        }}
      />
    );
  }
  return (
    <Field
      label={label}
      required={spec.required === true}
      requiredLabel={common('required')}
      {...(spec.hint !== undefined && { hint: spec.hint })}
      {...error}
    >
      {(control) => {
        if (spec.kind === 'date') {
          return (
            <DateInput
              {...control}
              value={text === '' ? null : text}
              onChange={(next) => {
                onChange(next ?? '');
              }}
              placeholder={t('chooseDate')}
            />
          );
        }
        if (spec.kind === 'select') {
          return (
            <Select
              {...control}
              value={text}
              placeholder={t('choose')}
              options={spec.options ?? []}
              onChange={(event) => {
                onChange(event.target.value);
              }}
            />
          );
        }
        if (spec.kind === 'textarea') {
          return (
            <Textarea
              {...control}
              value={text}
              onChange={(event) => {
                onChange(event.target.value);
              }}
            />
          );
        }
        return (
          <Input
            {...control}
            type={spec.kind === 'datetime' ? 'datetime-local' : 'text'}
            value={text}
            inputMode={
              spec.kind === 'money' || spec.kind === 'decimal'
                ? 'decimal'
                : spec.kind === 'integer'
                  ? 'numeric'
                  : undefined
            }
            placeholder={spec.kind === 'month' ? 'YYYY-MM' : undefined}
            onChange={(event) => {
              onChange(event.target.value);
            }}
          />
        );
      }}
    </Field>
  );
}

function LinesEditor({
  spec,
  rows,
  onChange,
  errors,
}: {
  readonly spec: LinesSpec;
  readonly rows: readonly Row[];
  readonly onChange: (rows: readonly Row[]) => void;
  readonly errors: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useTranslations('forms');
  return (
    <fieldset className="flex flex-col gap-3 rounded-control border border-line p-3">
      <legend className="px-1 text-[13px] font-medium">{spec.label}</legend>
      {rows.map((row, index) => (
        // Rows have no id until saved; the values live in state, so the position is the key.
        <div
          key={index}
          className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))_auto] sm:items-end"
        >
          {spec.fields.map((field) => (
            <Control
              key={field.name}
              spec={field}
              label={t('lineField', { field: field.label, line: index + 1 })}
              value={row.get(field.name)}
              error={errorOf(errors, `${spec.name}.${String(index)}.${field.name}`)}
              onChange={(next) => {
                onChange(
                  rows.map((current, at) =>
                    at === index ? new Map(current).set(field.name, next) : current,
                  ),
                );
              }}
            />
          ))}
          <Button
            size="sm"
            variant="secondary"
            aria-label={t('removeLine', { line: index + 1 })}
            disabled={rows.length <= (spec.minRows ?? 1)}
            onClick={() => {
              onChange(rows.filter((_, at) => at !== index));
            }}
          >
            {t('remove')}
          </Button>
        </div>
      ))}
      <div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            onChange([...rows, emptyRow(spec.fields)]);
          }}
        >
          {spec.addLabel}
        </Button>
      </div>
      {errorOf(errors, spec.name).error !== undefined && !errors.has(`${spec.name}.0`) && (
        <p className="text-xs text-crit">{errors.get(spec.name)}</p>
      )}
    </fieldset>
  );
}

export interface FormDialogProps<S extends z.ZodType> {
  readonly title: string;
  readonly description?: string;
  readonly submitLabel: string;
  readonly schema: S;
  readonly fields: readonly FormSpec[];
  /** Sent as they are, not shown: ids from the page, empty file lists… */
  readonly fixed?: Readonly<Record<string, unknown>>;
  readonly initial?: Initial;
  /** Reshape the body before it is checked, e.g. a list of picked rows into a list of ids. */
  readonly transform?: (body: Record<string, unknown>) => Record<string, unknown>;
  readonly submit: (body: z.output<S>) => Promise<unknown>;
  readonly success: string;
  readonly invalidate?: readonly string[];
  /** A line under the fields, e.g. "The server works out the VAT." */
  readonly note?: string;
  /** Shown under the fields and fed the current values, e.g. possible duplicates. */
  readonly aside?: (values: FormValues) => ReactNode;
  readonly danger?: boolean;
  readonly onClose: () => void;
}

export function FormDialog<S extends z.ZodType>({
  title,
  description,
  submitLabel,
  schema,
  fields,
  fixed = {},
  initial = {},
  transform = (body) => body,
  submit,
  success,
  invalidate = [],
  note,
  aside,
  danger = false,
  onClose,
}: FormDialogProps<S>): ReactNode {
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [values, setValues] = useState<FormValues>(() => startValues(fields, initial));
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const command = useCommand((body: z.output<S>) => submit(body), {
    success,
    invalidate,
    onSuccess: onClose,
  });
  const set = (name: string, value: Value) => {
    setValues((current) => new Map(current).set(name, value));
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      {...(description !== undefined && { description })}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={command.isPending}
            onClick={() => {
              const result = schema.safeParse(transform(bodyOf(fields, values, fixed)));
              setErrors(fieldErrors(result));
              if (result.success) command.mutate(result.data);
            }}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {command.isError && <Callout tone="crit" title={message(command.error)} />}
        {errors.get('') !== undefined && <Callout tone="crit" title={errors.get('') ?? ''} />}
        {fields.map((spec) =>
          spec.kind === 'lines' ? (
            <LinesEditor
              key={spec.name}
              spec={spec}
              rows={(values.get(spec.name) as readonly Row[] | undefined) ?? []}
              errors={errors}
              onChange={(rows) => {
                set(spec.name, rows);
              }}
            />
          ) : (
            <Control
              key={spec.name}
              spec={spec}
              label={spec.label}
              value={values.get(spec.name) as Scalar | undefined}
              error={errorOf(errors, spec.name)}
              onChange={(next) => {
                set(spec.name, next);
              }}
            />
          ),
        )}
        {aside?.(values)}
        {note !== undefined && <p className="text-xs text-muted">{note}</p>}
      </div>
    </Dialog>
  );
}

/** A button that opens a dialog, and the dialog it opens. */
export function DialogButton({
  label,
  ariaLabel,
  variant = 'primary',
  size,
  children,
}: {
  readonly label: string;
  readonly ariaLabel?: string;
  readonly variant?: 'primary' | 'secondary' | 'danger';
  readonly size?: 'sm';
  readonly children: (close: () => void) => ReactNode;
}): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        {...(size !== undefined && { size })}
        {...(ariaLabel !== undefined && { 'aria-label': ariaLabel })}
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      {open &&
        children(() => {
          setOpen(false);
        })}
    </>
  );
}
