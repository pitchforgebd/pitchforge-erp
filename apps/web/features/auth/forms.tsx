'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import {
  ConfirmTwoFactorRequest,
  LoginRequest,
  RequestPasswordReset,
  coreEndpoints as core,
  ResetPassword,
} from '@pitchforge/contracts';
import type { VerifyTwoFactorRequest } from '@pitchforge/contracts';
import { Button, Callout, Field, Input } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';

function FormError({ error }: { readonly error: unknown }): ReactNode {
  const message = useErrorMessage();
  if (error === null || error === undefined) return null;
  return <Callout tone="crit" title={message(error)} />;
}

export function LoginForm(): ReactNode {
  const t = useTranslations('login');
  const common = useTranslations('common');
  const router = useRouter();
  const form = useForm<z.input<typeof LoginRequest>>({
    resolver: zodResolver(LoginRequest),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: (body: z.input<typeof LoginRequest>) => browserCall(core.login, { body }),
    onSuccess: (result) => {
      if (result.status === 'authenticated') router.push('/home');
      if (result.status === 'two_factor_required') router.push('/two-factor');
      if (result.status === 'two_factor_enrolment_required') router.push('/two-factor/enrol');
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          login.mutate(values);
        })(event);
      }}
    >
      <h1 className="text-lg font-semibold">{t('title')}</h1>
      <FormError error={login.error} />
      <Field
        label={t('email')}
        required
        requiredLabel={common('required')}
        {...(form.formState.errors.email && { error: t('emailInvalid') })}
      >
        {(control) => (
          <Input {...control} {...form.register('email')} type="email" autoComplete="username" />
        )}
      </Field>
      <Field
        label={t('password')}
        required
        requiredLabel={common('required')}
        {...(form.formState.errors.password && { error: t('passwordRequired') })}
      >
        {(control) => (
          <Input
            {...control}
            {...form.register('password')}
            type="password"
            autoComplete="current-password"
          />
        )}
      </Field>
      <Button type="submit" loading={login.isPending}>
        {t('submit')}
      </Button>
      <Link href="/reset-password" className="text-center text-sm text-accent underline">
        {t('forgot')}
      </Link>
    </form>
  );
}

interface CodeFormProps {
  readonly label: string;
  readonly invalidMessage: string;
  readonly submitLabel: string;
  readonly pending: boolean;
  readonly onSubmit: (code: string) => void;
}

function CodeForm({
  label,
  invalidMessage,
  submitLabel,
  pending,
  onSubmit,
}: CodeFormProps): ReactNode {
  const form = useForm<z.input<typeof ConfirmTwoFactorRequest>>({
    resolver: zodResolver(ConfirmTwoFactorRequest),
    defaultValues: { code: '' },
  });
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void form.handleSubmit(({ code }) => {
          onSubmit(code);
        })(event);
      }}
    >
      <Field label={label} {...(form.formState.errors.code && { error: invalidMessage })}>
        {(control) => (
          <Input
            {...control}
            {...form.register('code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
        )}
      </Field>
      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function TwoFactorForm(): ReactNode {
  const t = useTranslations('twoFactor');
  const router = useRouter();
  const verify = useMutation({
    mutationFn: (body: z.input<typeof VerifyTwoFactorRequest>) =>
      browserCall(core.verifyTwoFactor, { body }),
    onSuccess: () => {
      router.push('/home');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>
      <FormError error={verify.error} />
      <CodeForm
        label={t('code')}
        invalidMessage={t('codeInvalid')}
        submitLabel={t('submit')}
        pending={verify.isPending}
        onSubmit={(code) => {
          verify.mutate({ code });
        }}
      />
      <Link href="/login" className="text-center text-sm text-accent underline">
        {t('backToLogin')}
      </Link>
    </div>
  );
}

export function EnrolForm(): ReactNode {
  const t = useTranslations('enrol');
  const router = useRouter();
  const [recoveryCodes, setRecoveryCodes] = useState<readonly string[] | null>(null);

  const enrolment = useQuery({
    queryKey: ['two-factor-enrolment'],
    queryFn: () => browserCall(core.beginTwoFactorEnrolment, {}),
    staleTime: Infinity,
  });
  const confirm = useMutation({
    mutationFn: (body: z.input<typeof ConfirmTwoFactorRequest>) =>
      browserCall(core.confirmTwoFactorEnrolment, { body }),
    onSuccess: (result) => {
      setRecoveryCodes(result.recoveryCodes);
    },
  });

  if (recoveryCodes !== null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">{t('recoveryTitle')}</h1>
          <p className="text-sm text-muted">{t('recoveryDescription')}</p>
        </div>
        <ul className="grid grid-cols-2 gap-1 rounded-control bg-surface-2 p-3 font-mono text-sm">
          {recoveryCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <Button
          onClick={() => {
            router.push('/home');
          }}
        >
          {t('done')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>
      <FormError error={enrolment.error ?? confirm.error} />
      {enrolment.data === undefined ? (
        <p className="text-sm text-muted">{t('loading')}</p>
      ) : (
        <>
          <div>
            <p className="text-[13px] font-medium">{t('key')}</p>
            <p className="rounded-control bg-surface-2 p-2 font-mono text-xs break-all">
              {enrolment.data.otpauthUri}
            </p>
          </div>
          <CodeForm
            label={t('code')}
            invalidMessage={t('codeInvalid')}
            submitLabel={t('submit')}
            pending={confirm.isPending}
            onSubmit={(code) => {
              confirm.mutate({ code });
            }}
          />
        </>
      )}
    </div>
  );
}

export function ResetRequestForm(): ReactNode {
  const t = useTranslations('reset');
  const form = useForm<z.input<typeof RequestPasswordReset>>({
    resolver: zodResolver(RequestPasswordReset),
    defaultValues: { email: '' },
  });
  const request = useMutation({
    mutationFn: (body: z.input<typeof RequestPasswordReset>) =>
      browserCall(core.requestPasswordReset, { body }),
  });

  if (request.isSuccess) {
    return (
      <div className="flex flex-col gap-3">
        <Callout tone="good" title={t('sentTitle')}>
          {t('sentDescription')}
        </Callout>
        <Link href="/login" className="text-center text-sm text-accent underline">
          {t('backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          request.mutate(values);
        })(event);
      }}
    >
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>
      <FormError error={request.error} />
      <Field label={t('email')} {...(form.formState.errors.email && { error: t('emailInvalid') })}>
        {(control) => (
          <Input {...control} {...form.register('email')} type="email" autoComplete="username" />
        )}
      </Field>
      <Button type="submit" loading={request.isPending}>
        {t('submit')}
      </Button>
      <Link href="/login" className="text-center text-sm text-accent underline">
        {t('backToLogin')}
      </Link>
    </form>
  );
}

/**
 * The page a reset email opens. The token comes in the URL fragment (#token=…), which browsers
 * never send to a server or put in a Referer, and it is wiped from the address bar on arrival.
 */
export function ResetPasswordScreen(): ReactNode {
  const fromLink = useSyncExternalStore(noChanges, readResetToken, () => undefined);
  useEffect(() => {
    if (typeof fromLink === 'string') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    return () => {
      captured = undefined;
    };
  }, [fromLink]);
  if (fromLink === undefined) return null;
  return fromLink === null ? <ResetRequestForm /> : <NewPasswordForm token={fromLink} />;
}

/** Read once per visit, before the fragment is wiped; forgotten when the screen closes. */
let captured: string | null | undefined;
function readResetToken(): string | null {
  captured ??= new URLSearchParams(window.location.hash.slice(1)).get('token');
  return captured;
}
const noChanges = () => () => undefined;

function NewPasswordForm({ token }: { readonly token: string }): ReactNode {
  const t = useTranslations('reset');
  const [confirm, setConfirm] = useState('');
  const form = useForm<z.input<typeof ResetPassword>>({
    resolver: zodResolver(ResetPassword),
    defaultValues: { token, newPassword: '' },
  });
  const reset = useMutation({
    mutationFn: (body: z.input<typeof ResetPassword>) => browserCall(core.resetPassword, { body }),
  });
  const [mismatch, setMismatch] = useState(false);

  if (reset.isSuccess) {
    return (
      <div className="flex flex-col gap-3">
        <Callout tone="good" title={t('doneTitle')}>
          {t('doneDescription')}
        </Callout>
        <Link href="/login" className="text-center text-sm text-accent underline">
          {t('backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          const same = confirm === values.newPassword;
          setMismatch(!same);
          if (same) reset.mutate(values);
        })(event);
      }}
    >
      <div>
        <h1 className="text-lg font-semibold">{t('newTitle')}</h1>
        <p className="text-sm text-muted">{t('newDescription')}</p>
      </div>
      <FormError error={reset.error} />
      <Field
        label={t('newPassword')}
        hint={t('passwordRules')}
        {...(form.formState.errors.newPassword && { error: t('passwordInvalid') })}
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
      <Field label={t('confirmPassword')} {...(mismatch && { error: t('passwordsDiffer') })}>
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
            }}
          />
        )}
      </Field>
      <Button type="submit" loading={reset.isPending}>
        {t('setPassword')}
      </Button>
    </form>
  );
}
