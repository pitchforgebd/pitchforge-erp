'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ChangePassword, coreEndpoints as core } from '@pitchforge/contracts';
import type { NotificationPreferences } from '@pitchforge/contracts';
import { Button, Callout, Checkbox, DataTable, Field, Input, StatusPill } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { Card, PageHeader } from '../common/page-header.tsx';
import { useSession } from '../common/session.tsx';
import { ErrorState, LoadingState } from '../common/states.tsx';
import { useCommand } from '../common/step-up.tsx';
import { TimeText } from '../common/time.tsx';

function Sessions(): ReactNode {
  const t = useTranslations('account');
  const sessions = useQuery({
    queryKey: [core.listMySessions.id],
    queryFn: () => browserCall(core.listMySessions, {}),
  });
  const revoke = useCommand((id: string) => browserCall(core.revokeMySession, { params: { id } }), {
    success: t('revoked'),
    invalidate: [core.listMySessions.id],
  });

  return (
    <Card title={t('sessions')} description={t('sessionsDescription')}>
      <DataTable
        label={t('sessions')}
        rows={sessions.data?.items ?? []}
        getRowId={(row) => row.id}
        status={sessions.isPending ? 'loading' : sessions.isError ? 'error' : 'ready'}
        loadingState={<LoadingState />}
        errorState={<ErrorState error={sessions.error} />}
        emptyState={null}
        columns={[
          {
            id: 'device',
            header: t('device'),
            cell: (row) => (
              <span className="flex flex-wrap items-center gap-2">
                {row.device}
                {row.current && <StatusPill tone="good">{t('current')}</StatusPill>}
              </span>
            ),
          },
          {
            id: 'ip',
            header: t('ipAddress'),
            cell: (row) => <span className="font-mono text-xs">{row.ipAddress}</span>,
          },
          { id: 'seen', header: t('lastSeen'), cell: (row) => <TimeText value={row.lastSeenAt} /> },
          {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (row) =>
              row.current ? null : (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={revoke.isPending && revoke.variables === row.id}
                  onClick={() => {
                    revoke.mutate(row.id);
                  }}
                >
                  {t('revoke')}
                </Button>
              ),
          },
        ]}
      />
    </Card>
  );
}

function PasswordForm(): ReactNode {
  const t = useTranslations('account');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const form = useForm<z.input<typeof ChangePassword>>({
    resolver: zodResolver(ChangePassword),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const change = useCommand(
    (body: z.input<typeof ChangePassword>) => browserCall(core.changePassword, { body }),
    {
      success: t('passwordChanged'),
      onSuccess: () => {
        form.reset();
      },
    },
  );

  return (
    <Card title={t('password')} description={t('passwordDescription')}>
      <form
        noValidate
        className="flex max-w-md flex-col gap-4 p-4"
        onSubmit={(event) => {
          void form.handleSubmit((values) => {
            change.mutate(values);
          })(event);
        }}
      >
        {change.isError && <Callout tone="crit" title={message(change.error)} />}
        <Field label={t('currentPassword')} required requiredLabel={common('required')}>
          {(control) => (
            <Input
              {...control}
              {...form.register('currentPassword')}
              type="password"
              autoComplete="current-password"
            />
          )}
        </Field>
        <Field
          label={t('newPassword')}
          required
          requiredLabel={common('required')}
          {...(form.formState.errors.newPassword && { error: t('newPasswordInvalid') })}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('newPassword')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </Field>
        <div>
          <Button type="submit" loading={change.isPending}>
            {t('changePassword')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function NotificationSettings(): ReactNode {
  const t = useTranslations('account');
  const message = useErrorMessage();
  const preferences = useQuery({
    queryKey: [core.getNotificationPreferences.id],
    queryFn: () => browserCall(core.getNotificationPreferences, {}),
  });
  const save = useCommand(
    (body: NotificationPreferences) => browserCall(core.updateNotificationPreferences, { body }),
    { success: t('preferencesSaved'), invalidate: [core.getNotificationPreferences.id] },
  );
  const shown = save.data ?? preferences.data;
  return (
    <Card title={t('notifications')} description={t('notificationsDescription')}>
      <div className="flex flex-col gap-3 p-4">
        {preferences.isPending && <LoadingState />}
        {preferences.isError && <ErrorState error={preferences.error} />}
        {save.isError && <Callout tone="crit" title={message(save.error)} />}
        {shown !== undefined &&
          (['email', 'push', 'dailyDigest'] as const).map((channel) => (
            <Checkbox
              key={channel}
              label={t(`channels.${channel}`)}
              checked={new Map(Object.entries(shown)).get(channel) === true}
              onCheckedChange={(checked) => {
                save.mutate({ ...shown, [channel]: checked === true });
              }}
            />
          ))}
      </div>
    </Card>
  );
}

export function AccountPage(): ReactNode {
  const t = useTranslations('account');
  const session = useSession();
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <div className="flex flex-col gap-4">
        <Card title={t('profile')}>
          <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-[max-content_1fr]">
            <dt className="text-muted">{t('name')}</dt>
            <dd>{session.name}</dd>
            <dt className="text-muted">{t('email')}</dt>
            <dd>{session.email}</dd>
            <dt className="text-muted">{t('twoFactor')}</dt>
            <dd>
              <StatusPill tone={session.twoFactorEnabled ? 'good' : 'warn'}>
                {session.twoFactorEnabled ? t('twoFactorOn') : t('twoFactorOff')}
              </StatusPill>
            </dd>
          </dl>
        </Card>
        <Sessions />
        <NotificationSettings />
        <PasswordForm />
      </div>
    </>
  );
}
