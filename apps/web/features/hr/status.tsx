'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { LeaveRequest, PayrollRun } from '@pitchforge/contracts';
import { StatusPill } from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

const LEAVE_TONE = new Map<LeaveRequest['status'], Tone>([
  ['draft', 'neutral'],
  ['pending_approval', 'warn'],
  ['approved', 'good'],
  ['rejected', 'crit'],
  ['cancelled', 'neutral'],
]);

export function LeaveStatusPill({
  status,
}: {
  readonly status: LeaveRequest['status'];
}): ReactNode {
  const t = useTranslations('hr.leaveStatus');
  return <StatusPill tone={LEAVE_TONE.get(status) ?? 'neutral'}>{t(status)}</StatusPill>;
}

const RUN_TONE = new Map<PayrollRun['status'], Tone>([
  ['calculating', 'info'],
  ['draft', 'neutral'],
  ['pending_approval', 'warn'],
  ['approved', 'info'],
  ['locked', 'good'],
  ['rejected', 'crit'],
]);

/** Any approval-style status: draft, pending, approved, locked, paid… */
export function FlowStatusPill({ status }: { readonly status: string }): ReactNode {
  const t = useTranslations('hr.flowStatus');
  const tone =
    RUN_TONE.get(status as PayrollRun['status']) ??
    (status === 'paid' || status === 'active' ? 'good' : 'neutral');
  return <StatusPill tone={tone}>{t(status)}</StatusPill>;
}

/** A YYYY-MM month as "November 2026". */
export function MonthText({ month }: { readonly month: string }): ReactNode {
  const [year, number] = month.split('-');
  const t = useTranslations('hr.months');
  return <span>{`${t(number ?? '01')} ${year ?? ''}`}</span>;
}
