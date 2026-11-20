'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { DelegateApproval, coreEndpoints as core } from '@pitchforge/contracts';
import type { ApprovalRequest } from '@pitchforge/contracts';

import { browserCall } from '../../lib/api/browser.ts';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import { useSession } from '../common/session.tsx';
import { useList } from '../common/use-list.ts';

/** Hand an approval to someone else while away; the history keeps who decided. */
export function DelegateButton({ approval }: { readonly approval: ApprovalRequest }): ReactNode {
  const t = useTranslations('forms');
  const session = useSession();
  const users = useList(core.listUsers, { status: 'active' });
  const options = users.items
    .filter((user) => user.id !== session.userId)
    .map((user) => ({ value: user.id, label: user.name }));
  return (
    <DialogButton label={t('delegate')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('delegateTitle')}
          description={t('delegateHint')}
          submitLabel={t('delegate')}
          schema={DelegateApproval}
          fields={[
            {
              name: 'delegateUserId',
              label: t('fields.delegate'),
              kind: 'select',
              required: true,
              options,
            },
            { name: 'reason', label: t('fields.reason'), kind: 'textarea', required: true },
          ]}
          submit={(body) =>
            browserCall(core.delegate, {
              params: { id: approval.id },
              body,
              ifMatch: `"${String(approval.meta.version)}"`,
            })
          }
          success={t('delegated')}
          invalidate={[core.listApprovals.id, core.getApproval.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}
