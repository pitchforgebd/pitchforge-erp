import { cva } from 'class-variance-authority';
import { Check, CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn.ts';

export type Tone = 'neutral' | 'good' | 'warn' | 'crit' | 'info';

const pill = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-muted',
      good: 'bg-good-soft text-good',
      warn: 'bg-warn-soft text-warn',
      crit: 'bg-crit-soft text-crit',
      info: 'bg-info-soft text-info',
    },
  },
});

export interface StatusPillProps {
  readonly tone: Tone;
  /** Translated status text. Colour alone never carries the meaning. */
  readonly children: ReactNode;
}

export function StatusPill({ tone, children }: StatusPillProps): ReactNode {
  return <span className={pill({ tone })}>{children}</span>;
}

/** A code or reference: BILL-2627-00187, PF-2603. */
export function Tag({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <span className="inline-block rounded border border-line bg-surface-2 px-1.5 font-mono text-[12.5px] whitespace-nowrap">
      {children}
    </span>
  );
}

export interface KpiTileProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly hint?: ReactNode;
}

export function KpiTile({ label, value, hint }: KpiTileProps): ReactNode {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {hint !== undefined && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export type StepState = 'done' | 'current' | 'waiting' | 'rejected';

export interface Step {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  readonly state: StepState;
}

const STEP_MARK: Readonly<Record<StepState, string>> = {
  done: 'border-good bg-good text-surface',
  current: 'border-accent bg-surface text-accent',
  waiting: 'border-line-strong bg-surface text-muted',
  rejected: 'border-crit bg-crit text-surface',
};

export interface StepsProps {
  readonly steps: readonly Step[];
  /** Translated name of each state, for screen readers. */
  readonly stateLabels: Readonly<Record<StepState, string>>;
  readonly label: string;
}

/** An approval chain: who has acted and who is next. */
export function Steps({ steps, stateLabels, label }: StepsProps): ReactNode {
  return (
    <ol aria-label={label} className="flex flex-col gap-3">
      {steps.map((step) => (
        <li
          key={step.id}
          aria-current={step.state === 'current' ? 'step' : undefined}
          className="flex items-start gap-3"
        >
          <span
            aria-hidden
            className={cn(
              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',

              STEP_MARK[step.state],
            )}
          >
            {step.state === 'done' && <Check className="size-3" />}
            {step.state === 'rejected' && <X className="size-3" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{step.label}</span>
            {}
            <span className="sr-only">{stateLabels[step.state]}</span>
            {step.detail !== undefined && (
              <span className="block text-xs text-muted">{step.detail}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

const callout = cva('flex gap-3 rounded-card border p-3 text-sm', {
  variants: {
    tone: {
      info: 'border-info bg-info-soft',
      good: 'border-good bg-good-soft',
      warn: 'border-warn bg-warn-soft',
      crit: 'border-crit bg-crit-soft',
    },
  },
});

const CALLOUT_ICON = {
  info: <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />,
  good: <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-good" />,
  warn: <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />,
  crit: <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-crit" />,
} as const;

export interface CalloutProps {
  readonly tone: 'info' | 'good' | 'warn' | 'crit';
  readonly title: string;
  readonly children?: ReactNode;
}

/** An inline message. Critical ones are announced to screen readers at once. */
export function Callout({ tone, title, children }: CalloutProps): ReactNode {
  return (
    <div role={tone === 'crit' ? 'alert' : 'status'} className={callout({ tone })}>
      {/* eslint-disable-next-line security/detect-object-injection -- key is the tone union */}
      {CALLOUT_ICON[tone]}
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {children !== undefined && <div className="text-muted">{children}</div>}
      </div>
    </div>
  );
}

export interface EmptyStateProps {
  readonly title: string;
  /** Use 'h1' when this is the page's only heading. */
  readonly titleAs?: 'p' | 'h1' | 'h2';
  readonly description?: string;
  readonly action?: ReactNode;
}

export function EmptyState({
  title,
  titleAs: Title = 'p',
  description,
  action,
}: EmptyStateProps): ReactNode {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Title className="font-display text-base font-semibold">{title}</Title>
      {description !== undefined && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  );
}
