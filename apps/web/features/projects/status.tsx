'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { Milestone, Task } from '@pitchforge/contracts';
import { StatusPill } from '@pitchforge/ui';
import type { Tone } from '@pitchforge/ui';

const MILESTONE_TONE: Readonly<Record<Milestone['status'], Tone>> = {
  planned: 'neutral',
  in_progress: 'info',
  delivered: 'warn',
  signed_off: 'good',
  invoiced: 'good',
};

/** The real status, with "overdue" as a separate flag the server sets. */
export function MilestoneStatusPill({
  status,
  overdue,
}: {
  readonly status: Milestone['status'];
  readonly overdue: boolean;
}): ReactNode {
  const t = useTranslations('projects.milestoneStatus');
  const projects = useTranslations('projects');
  return (
    <span className="flex flex-wrap gap-1">
      {/* eslint-disable-next-line security/detect-object-injection -- key is the milestone status union */}
      <StatusPill tone={MILESTONE_TONE[status]}>{t(status)}</StatusPill>
      {overdue && <StatusPill tone="crit">{projects('overdue')}</StatusPill>}
    </span>
  );
}

const TASK_TONE: Readonly<Record<Task['status'], Tone>> = {
  todo: 'neutral',
  in_progress: 'info',
  review: 'warn',
  done: 'good',
};

export function TaskStatusPill({ status }: { readonly status: Task['status'] }): ReactNode {
  const t = useTranslations('projects.taskStatus');
  // eslint-disable-next-line security/detect-object-injection -- key is the task status union
  return <StatusPill tone={TASK_TONE[status]}>{t(status)}</StatusPill>;
}
