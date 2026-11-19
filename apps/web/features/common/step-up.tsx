'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { createContext, use, useCallback, useRef, useState } from 'react';
import type { SyntheticEvent, ReactNode } from 'react';

import { coreEndpoints as core } from '@pitchforge/contracts';
import { Button, Callout, Dialog, Field, Input, useToast } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';

import { errorCodeOf, useErrorMessage } from './errors.ts';

type RequestStepUp = () => Promise<boolean>;

const StepUpContext = createContext<RequestStepUp | null>(null);

/**
 * Asks for the password again before a sensitive action (security architecture §1). The API
 * decides when this is needed, by answering STEP_UP_REQUIRED.
 */
export function StepUpProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const t = useTranslations('stepUp');
  const common = useTranslations('common');
  const message = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const settle = useRef<((confirmed: boolean) => void) | null>(null);

  const stepUp = useMutation({
    mutationFn: (value: string) => browserCall(core.stepUp, { body: { password: value } }),
    onSuccess: () => {
      settle.current?.(true);
      settle.current = null;
      setOpen(false);
    },
  });

  const request = useCallback<RequestStepUp>(
    () =>
      new Promise<boolean>((resolve) => {
        settle.current = resolve;
        setPassword('');
        stepUp.reset();
        setOpen(true);
      }),
    [stepUp],
  );

  const close = (next: boolean) => {
    if (next) return;
    settle.current?.(false);
    settle.current = null;
    setOpen(false);
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (password.length > 0) stepUp.mutate(password);
  };

  return (
    <StepUpContext value={request}>
      {children}
      <Dialog
        open={open}
        onOpenChange={close}
        title={t('title')}
        description={t('description')}
        closeLabel={common('close')}
      >
        <form id="step-up-form" noValidate className="flex flex-col gap-4" onSubmit={submit}>
          {stepUp.isError && <Callout tone="crit" title={message(stepUp.error)} />}
          <Field label={t('password')} required requiredLabel={common('required')}>
            {(control) => (
              <Input
                {...control}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                close(false);
              }}
            >
              {common('cancel')}
            </Button>
            <Button type="submit" loading={stepUp.isPending} disabled={password.length === 0}>
              {t('confirm')}
            </Button>
          </div>
        </form>
      </Dialog>
    </StepUpContext>
  );
}

function useStepUp(): RequestStepUp {
  const request = use(StepUpContext);
  if (request === null) throw new Error('useStepUp needs a StepUpProvider');
  return request;
}

export interface CommandOptions<R> {
  /** Toast shown on success. */
  readonly success?: string | ((result: R) => string);
  /** Query keys to refresh afterwards (endpoint ids). */
  readonly invalidate?: readonly string[];
  readonly onSuccess?: (result: R) => void;
}

/**
 * A command (approve, submit, post…): asks for step-up when the API wants it and retries once,
 * shows the outcome, and refreshes the lists it changed.
 */
export function useCommand<V, R>(
  run: (variables: V) => Promise<R>,
  options: CommandOptions<R> = {},
) {
  const requestStepUp = useStepUp();
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: V) => {
      try {
        return await run(variables);
      } catch (error) {
        if (errorCodeOf(error) !== 'STEP_UP_REQUIRED') throw error;
        if (!(await requestStepUp())) throw error;
        return run(variables);
      }
    },
    onSuccess: (result) => {
      const { success, invalidate = [], onSuccess } = options;
      if (success !== undefined) {
        toast({ tone: 'good', title: typeof success === 'string' ? success : success(result) });
      }
      for (const key of invalidate) void queryClient.invalidateQueries({ queryKey: [key] });
      onSuccess?.(result);
    },
  });
}
