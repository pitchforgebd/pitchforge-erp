'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  AssignRoles,
  CloneRole,
  ContactKind,
  CreateApprovalRule,
  CreateContact,
  CreateHoliday,
  CreateOrgUnit,
  CreateRole,
  DataScope,
  DeactivateUser,
  ImportType,
  InviteUser,
  OrgUnitType,
  RESTRICTED_KINDS,
  UpdateApprovalRule,
  UpdateCompany,
  UpdateContact,
  UpdateOrgUnit,
  UpdateReminderRule,
  UpdateRole,
  coreEndpoints as core,
} from '@pitchforge/contracts';
import type {
  ApprovalRule,
  Company,
  Contact,
  Holiday,
  ImportResult,
  OrgUnit,
  ReminderRule,
  Role,
  User,
} from '@pitchforge/contracts';
import { Button, Callout, DataTable, Dialog, Field, Select } from '@pitchforge/ui';

import { browserCall } from '../../lib/api/browser.ts';
import { useErrorMessage } from '../common/errors.ts';
import { FilePicker, uploadFile, useUploadError } from '../common/files.tsx';
import { DialogButton, FormDialog } from '../common/form-dialog.tsx';
import type { FormSpec } from '../common/form-dialog.tsx';
import { useCommand } from '../common/step-up.tsx';
import { useList } from '../common/use-list.ts';
import { typed } from '../finance/forms.tsx';

/** Rows of picked ids into a list of ids. */
const ids = (field: string) => (body: Record<string, unknown>) => ({
  ...body,
  [field]: (new Map(Object.entries(body)).get(field) as readonly { id: string }[]).map(
    (row) => row.id,
  ),
});

function useRoleOptions() {
  const roles = useList(core.listRoles, {});
  return roles.items.map((role) => ({ value: role.id, label: role.name }));
}

function useUserOptions() {
  const users = useList(core.listUsers, { status: 'active' });
  return users.items.map((user) => ({ value: user.id, label: user.name }));
}

function useDepartmentOptions() {
  const units = useList(core.listOrgUnits, { type: 'department' });
  return units.items.map((unit) => ({ value: unit.id, label: unit.name }));
}

/* Users ------------------------------------------------------------------------------------- */

export function InviteUserButton(): ReactNode {
  const t = useTranslations('forms');
  const roles = useRoleOptions();
  const departments = useDepartmentOptions();
  return (
    <DialogButton label={t('inviteUser')}>
      {(close) => (
        <FormDialog
          title={t('inviteUser')}
          description={t('inviteHint')}
          submitLabel={t('invite')}
          schema={InviteUser}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            { name: 'email', label: t('fields.email'), kind: 'text', required: true },
            {
              name: 'roleIds',
              label: t('fields.roles'),
              kind: 'lines',
              addLabel: t('addRole'),
              fields: [{ name: 'id', label: t('fields.role'), kind: 'select', options: roles }],
            },
            {
              name: 'departmentId',
              label: t('fields.department'),
              kind: 'select',
              nullable: true,
              options: departments,
            },
            {
              name: 'accessExpiresAt',
              label: t('fields.accessExpires'),
              kind: 'datetime',
              nullable: true,
              hint: t('accessExpiresHint'),
            },
          ]}
          transform={ids('roleIds')}
          note={t('stepUpNote')}
          submit={(body) => browserCall(core.inviteUser, { body })}
          success={t('invited')}
          invalidate={[core.listUsers.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function UserActions({ user }: { readonly user: User }): ReactNode {
  const t = useTranslations('forms');
  const message = useErrorMessage();
  const roles = useRoleOptions();
  const people = useUserOptions().filter((option) => option.value !== user.id);
  const ifMatch = `"${String(user.meta.version)}"`;
  const signOut = useCommand(
    () => browserCall(core.forceSignOut, { params: { id: user.id }, ifMatch }),
    { success: t('signedOut') },
  );
  return (
    <span className="flex flex-wrap justify-end gap-2">
      {user.allowedActions.includes('assign_roles') && (
        <DialogButton
          label={t('roles')}
          ariaLabel={t('rolesOf', { name: user.name })}
          size="sm"
          variant="secondary"
        >
          {(close) => (
            <FormDialog
              title={t('rolesOf', { name: user.name })}
              submitLabel={t('save')}
              schema={AssignRoles}
              fields={[
                {
                  name: 'roleIds',
                  label: t('fields.roles'),
                  kind: 'lines',
                  addLabel: t('addRole'),
                  fields: [{ name: 'id', label: t('fields.role'), kind: 'select', options: roles }],
                },
              ]}
              initial={{ roleIds: user.roleIds.map((id) => ({ id })) }}
              transform={ids('roleIds')}
              note={t('stepUpNote')}
              submit={(body) =>
                browserCall(core.assignUserRoles, { params: { id: user.id }, body, ifMatch })
              }
              success={t('saved')}
              invalidate={[core.listUsers.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
      {user.allowedActions.includes('force_sign_out') && (
        <Button
          size="sm"
          variant="secondary"
          aria-label={t('signOutLabel', { name: user.name })}
          loading={signOut.isPending}
          onClick={() => {
            signOut.mutate(undefined);
          }}
        >
          {t('signOut')}
        </Button>
      )}
      {user.allowedActions.includes('deactivate') && (
        <DialogButton
          label={t('deactivate')}
          ariaLabel={t('deactivateLabel', { name: user.name })}
          size="sm"
          variant="danger"
        >
          {(close) => (
            <FormDialog
              title={t('deactivateLabel', { name: user.name })}
              description={t('deactivateHint')}
              submitLabel={t('deactivate')}
              danger
              schema={DeactivateUser}
              fields={[
                {
                  name: 'delegateUserId',
                  label: t('fields.delegate'),
                  kind: 'select',
                  required: true,
                  options: people,
                },
              ]}
              note={t('stepUpNote')}
              submit={(body) =>
                browserCall(core.deactivateUser, { params: { id: user.id }, body, ifMatch })
              }
              success={t('deactivated')}
              invalidate={[core.listUsers.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
      {signOut.isError && <Callout tone="crit" title={message(signOut.error)} />}
    </span>
  );
}

/* Roles ------------------------------------------------------------------------------------- */

function useRoleFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const scopes = useTranslations('forms.scopes');
  return [
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    { name: 'description', label: t('fields.description'), kind: 'textarea', nullable: true },
    {
      name: 'grants',
      label: t('fields.grants'),
      kind: 'lines',
      addLabel: t('addGrant'),
      minRows: 0,
      fields: [
        { name: 'area', label: t('fields.area'), kind: 'text' },
        { name: 'actions', label: t('fields.actions'), kind: 'text' },
        {
          name: 'scope',
          label: t('fields.scope'),
          kind: 'select',
          options: DataScope.options.map((value) => ({ value, label: scopes(value) })),
        },
      ],
    },
    {
      name: 'restrictedFields',
      label: t('fields.restrictedFields'),
      kind: 'lines',
      addLabel: t('addField'),
      minRows: 0,
      fields: [
        {
          name: 'kind',
          label: t('fields.field'),
          kind: 'select',
          options: RESTRICTED_KINDS.map((value) => ({
            value,
            label: t(`restrictedKinds.${value}`),
          })),
        },
      ],
    },
  ];
}

/** "read, create" as typed into the list the contract wants; the server checks the words. */
const roleBody = (body: Record<string, unknown>) => ({
  ...body,
  grants: (body['grants'] as readonly { area: string; actions: string; scope: string }[]).map(
    (grant) => ({
      ...grant,
      actions: grant.actions
        .split(',')
        .map((action) => action.trim())
        .filter((action) => action !== ''),
    }),
  ),
  restrictedFields: (body['restrictedFields'] as readonly { kind: string }[]).map(
    (row) => row.kind,
  ),
});

const roleInitial = (role: Role) => ({
  name: role.name,
  description: role.description ?? '',
  grants: role.grants.map((grant) => ({
    area: grant.area,
    actions: grant.actions.join(', '),
    scope: grant.scope,
  })),
  restrictedFields: role.restrictedFields.map((kind) => ({ kind })),
});

export function NewRoleButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useRoleFields();
  return (
    <DialogButton label={t('newRole')}>
      {(close) => (
        <FormDialog
          title={t('newRole')}
          description={t('grantsHint')}
          submitLabel={t('save')}
          schema={CreateRole}
          fields={fields}
          initial={{ grants: [], restrictedFields: [] }}
          transform={roleBody}
          note={t('stepUpNote')}
          submit={(body) => browserCall(core.createRole, { body })}
          success={t('saved')}
          invalidate={[core.listRoles.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function RoleActions({ role }: { readonly role: Role }): ReactNode {
  const t = useTranslations('forms');
  const fields = useRoleFields();
  const ifMatch = `"${String(role.meta.version)}"`;
  return (
    <span className="flex justify-end gap-2">
      {role.allowedActions.includes('update') && (
        <DialogButton
          label={t('edit')}
          ariaLabel={t('editLabel', { name: role.name })}
          size="sm"
          variant="secondary"
        >
          {(close) => (
            <FormDialog
              title={t('editLabel', { name: role.name })}
              description={t('grantsHint')}
              submitLabel={t('save')}
              schema={UpdateRole}
              fields={fields}
              initial={roleInitial(role)}
              transform={roleBody}
              note={t('stepUpNote')}
              submit={(body) =>
                browserCall(core.updateRole, { params: { id: role.id }, body, ifMatch })
              }
              success={t('saved')}
              invalidate={[core.listRoles.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
      {role.allowedActions.includes('clone') && (
        <DialogButton
          label={t('clone')}
          ariaLabel={t('cloneLabel', { name: role.name })}
          size="sm"
          variant="secondary"
        >
          {(close) => (
            <FormDialog
              title={t('cloneLabel', { name: role.name })}
              submitLabel={t('clone')}
              schema={CloneRole}
              fields={[{ name: 'name', label: t('fields.newName'), kind: 'text', required: true }]}
              initial={{ name: t('copyOf', { name: role.name }) }}
              note={t('stepUpNote')}
              submit={(body) => browserCall(core.cloneRole, { params: { id: role.id }, body })}
              success={t('saved')}
              invalidate={[core.listRoles.id]}
              onClose={close}
            />
          )}
        </DialogButton>
      )}
    </span>
  );
}

/* Approval rules ---------------------------------------------------------------------------- */

function useRuleFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  const roles = useRoleOptions();
  const departments = useDepartmentOptions();
  return [
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    {
      name: 'sourceType',
      label: t('fields.sourceType'),
      kind: 'text',
      required: true,
      hint: t('sourceTypeHint'),
    },
    { name: 'minAmount', label: t('fields.minAmount'), kind: 'money', nullable: true },
    { name: 'maxAmount', label: t('fields.maxAmount'), kind: 'money', nullable: true },
    {
      name: 'departmentId',
      label: t('fields.department'),
      kind: 'select',
      nullable: true,
      options: departments,
    },
    {
      name: 'approverRoleIds',
      label: t('fields.approvers'),
      kind: 'lines',
      addLabel: t('addRole'),
      fields: [{ name: 'id', label: t('fields.role'), kind: 'select', options: roles }],
    },
    {
      name: 'mode',
      label: t('fields.mode'),
      kind: 'select',
      required: true,
      options: (['any', 'all', 'sequence'] as const).map((value) => ({
        value,
        label: t(`modes.${value}`),
      })),
    },
    { name: 'slaHours', label: t('fields.slaHours'), kind: 'integer', nullable: true },
  ];
}

const ruleBody = (body: Record<string, unknown>) => ({
  ...ids('approverRoleIds')(body),
  projectId: null,
});

export function NewApprovalRuleButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useRuleFields();
  return (
    <DialogButton label={t('newApprovalRule')}>
      {(close) => (
        <FormDialog
          title={t('newApprovalRule')}
          submitLabel={t('save')}
          schema={CreateApprovalRule}
          fields={fields}
          initial={{ mode: 'any' }}
          transform={ruleBody}
          note={t('stepUpNote')}
          submit={(body) => browserCall(core.createApprovalRule, { body })}
          success={t('saved')}
          invalidate={[core.listApprovalRules.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditApprovalRuleButton({ rule }: { readonly rule: ApprovalRule }): ReactNode {
  const t = useTranslations('forms');
  const fields = useRuleFields();
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: rule.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: rule.name })}
          submitLabel={t('save')}
          schema={UpdateApprovalRule}
          fields={[...fields, { name: 'active', label: t('fields.active'), kind: 'checkbox' }]}
          initial={{
            name: rule.name,
            sourceType: rule.sourceType,
            minAmount: rule.minAmount === null ? '' : typed(rule.minAmount),
            maxAmount: rule.maxAmount === null ? '' : typed(rule.maxAmount),
            departmentId: rule.departmentId ?? '',
            approverRoleIds: rule.approverRoleIds.map((id) => ({ id })),
            mode: rule.mode,
            slaHours: rule.slaHours === null ? '' : String(rule.slaHours),
            active: rule.active,
          }}
          transform={ruleBody}
          note={t('stepUpNote')}
          submit={(body) =>
            browserCall(core.updateApprovalRule, {
              params: { id: rule.id },
              body,
              ifMatch: `"${String(rule.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[core.listApprovalRules.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Company, units, holidays, reminders -------------------------------------------------------- */

export function EditCompanyButton({ company }: { readonly company: Company }): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton label={t('edit')} variant="secondary">
      {(close) => (
        <FormDialog
          title={t('editCompany')}
          submitLabel={t('save')}
          schema={UpdateCompany}
          fields={[
            { name: 'legalName', label: t('fields.legalName'), kind: 'text', required: true },
            {
              name: 'tin',
              label: t('fields.tin'),
              kind: 'text',
              required: true,
              hint: t('tinHint'),
            },
            { name: 'bin', label: t('fields.bin'), kind: 'text', required: true },
            { name: 'licenceNo', label: t('fields.licenceNo'), kind: 'text', nullable: true },
          ]}
          initial={{
            legalName: company.legalName,
            tin: company.tin,
            bin: company.bin,
            licenceNo: company.licenceNo ?? '',
          }}
          submit={(body) =>
            browserCall(core.updateCompany, {
              params: { id: company.id },
              body,
              ifMatch: `"${String(company.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[core.getCompany.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function LogoUpload({ company }: { readonly company: Company }): ReactNode {
  const t = useTranslations('forms');
  const uploadError = useUploadError();
  const [picked, setPicked] = useState<File | null>(null);
  const save = useCommand(
    async (file: File) => {
      const stored = await uploadFile(file, { recordType: 'company', recordId: company.id });
      return browserCall(core.updateCompany, {
        params: { id: company.id },
        body: { logoFileId: stored.id },
        ifMatch: `"${String(company.meta.version)}"`,
      });
    },
    { success: t('logoSaved'), invalidate: [core.getCompany.id] },
  );
  return (
    <div className="flex flex-wrap items-end gap-2">
      <FilePicker label={t('fields.logo')} accept="image/png,image/jpeg" onPick={setPicked} />
      <Button
        size="sm"
        variant="secondary"
        loading={save.isPending}
        disabled={picked === null}
        onClick={() => {
          if (picked !== null) save.mutate(picked);
        }}
      >
        {t('uploadLogo')}
      </Button>
      {save.isError && <Callout tone="crit" title={uploadError(save.error)} />}
    </div>
  );
}

export function NewOrgUnitButton(): ReactNode {
  const t = useTranslations('forms');
  const units = useList(core.listOrgUnits, {});
  return (
    <DialogButton label={t('newOrgUnit')}>
      {(close) => (
        <FormDialog
          title={t('newOrgUnit')}
          submitLabel={t('save')}
          schema={CreateOrgUnit}
          fields={[
            {
              name: 'type',
              label: t('fields.type'),
              kind: 'select',
              required: true,
              options: OrgUnitType.options.map((value) => ({
                value,
                label: t(`unitTypes.${value}`),
              })),
            },
            { name: 'code', label: t('fields.code'), kind: 'text', required: true },
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            {
              name: 'parentId',
              label: t('fields.parentUnit'),
              kind: 'select',
              nullable: true,
              options: units.items.map((unit) => ({ value: unit.id, label: unit.name })),
            },
          ]}
          initial={{ type: 'department' }}
          submit={(body) => browserCall(core.createOrgUnit, { body })}
          success={t('saved')}
          invalidate={[core.listOrgUnits.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditOrgUnitButton({ unit }: { readonly unit: OrgUnit }): ReactNode {
  const t = useTranslations('forms');
  const units = useList(core.listOrgUnits, {});
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: unit.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: unit.name })}
          submitLabel={t('save')}
          schema={UpdateOrgUnit}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            {
              name: 'parentId',
              label: t('fields.parentUnit'),
              kind: 'select',
              nullable: true,
              options: units.items
                .filter((other) => other.id !== unit.id)
                .map((other) => ({ value: other.id, label: other.name })),
            },
            { name: 'active', label: t('fields.active'), kind: 'checkbox' },
          ]}
          initial={{ name: unit.name, parentId: unit.parentId ?? '', active: unit.active }}
          submit={(body) =>
            browserCall(core.updateOrgUnit, {
              params: { id: unit.id },
              body,
              ifMatch: `"${String(unit.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[core.listOrgUnits.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function NewHolidayButton(): ReactNode {
  const t = useTranslations('forms');
  const branches = useList(core.listOrgUnits, { type: 'branch' });
  return (
    <DialogButton label={t('newHoliday')}>
      {(close) => (
        <FormDialog
          title={t('newHoliday')}
          submitLabel={t('save')}
          schema={CreateHoliday}
          fields={[
            { name: 'name', label: t('fields.name'), kind: 'text', required: true },
            { name: 'date', label: t('fields.date'), kind: 'date', required: true },
            {
              name: 'branchId',
              label: t('fields.branch'),
              kind: 'select',
              nullable: true,
              hint: t('allBranches'),
              options: branches.items.map((unit) => ({ value: unit.id, label: unit.name })),
            },
          ]}
          submit={(body) => browserCall(core.createHoliday, { body })}
          success={t('saved')}
          invalidate={[core.listHolidays.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function DeleteHolidayButton({ holiday }: { readonly holiday: Holiday }): ReactNode {
  const t = useTranslations('forms');
  const message = useErrorMessage();
  const remove = useCommand(
    () =>
      browserCall(core.deleteHoliday, {
        params: { id: holiday.id },
        ifMatch: `"${String(holiday.meta.version)}"`,
      }),
    { success: t('removed'), invalidate: [core.listHolidays.id] },
  );
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="secondary"
        aria-label={t('removeLabel', { name: holiday.name })}
        loading={remove.isPending}
        onClick={() => {
          remove.mutate(undefined);
        }}
      >
        {t('remove')}
      </Button>
      {remove.isError && <Callout tone="crit" title={message(remove.error)} />}
    </span>
  );
}

export function EditReminderButton({ rule }: { readonly rule: ReminderRule }): ReactNode {
  const t = useTranslations('forms');
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: rule.subject })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: rule.subject })}
          submitLabel={t('save')}
          schema={UpdateReminderRule}
          fields={[
            {
              name: 'daysBefore',
              label: t('fields.daysBefore'),
              kind: 'lines',
              addLabel: t('addDay'),
              fields: [{ name: 'days', label: t('fields.days'), kind: 'integer' }],
            },
            { name: 'active', label: t('fields.active'), kind: 'checkbox' },
          ]}
          initial={{
            daysBefore: rule.daysBefore.map((days) => ({ days: String(days) })),
            active: rule.active,
          }}
          transform={(body) => ({
            ...body,
            daysBefore: (body['daysBefore'] as readonly { days: unknown }[]).map((row) => row.days),
          })}
          submit={(body) => browserCall(core.updateReminderRule, { params: { id: rule.id }, body })}
          success={t('saved')}
          invalidate={[core.listReminderRules.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Contacts ---------------------------------------------------------------------------------- */

function useContactFields(): readonly FormSpec[] {
  const t = useTranslations('forms');
  return [
    { name: 'name', label: t('fields.name'), kind: 'text', required: true },
    {
      name: 'kinds',
      label: t('fields.contactKinds'),
      kind: 'lines',
      addLabel: t('addKind'),
      fields: [
        {
          name: 'kind',
          label: t('fields.kind'),
          kind: 'select',
          options: ContactKind.options.map((value) => ({
            value,
            label: t(`contactKinds.${value}`),
          })),
        },
      ],
    },
    { name: 'email', label: t('fields.email'), kind: 'text', nullable: true },
    { name: 'phone', label: t('fields.phone'), kind: 'text', nullable: true },
    { name: 'bin', label: t('fields.bin'), kind: 'text', nullable: true },
    { name: 'tin', label: t('fields.tin'), kind: 'text', nullable: true },
    { name: 'bankAccountNumber', label: t('fields.accountNumber'), kind: 'text', nullable: true },
  ];
}

const kindList = (body: Record<string, unknown>) => ({
  ...body,
  kinds: (body['kinds'] as readonly { kind: string }[]).map((row) => row.kind),
});

export function NewContactButton(): ReactNode {
  const t = useTranslations('forms');
  const fields = useContactFields();
  return (
    <DialogButton label={t('newContact')}>
      {(close) => (
        <FormDialog
          title={t('newContact')}
          submitLabel={t('save')}
          schema={CreateContact}
          fields={fields}
          initial={{ kinds: [{ kind: 'vendor' }] }}
          transform={kindList}
          submit={(body) => browserCall(core.createContact, { body })}
          success={t('saved')}
          invalidate={[core.listContacts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

export function EditContactButton({ contact }: { readonly contact: Contact }): ReactNode {
  const t = useTranslations('forms');
  const fields = useContactFields();
  if (!contact.allowedActions.includes('update')) return null;
  return (
    <DialogButton
      label={t('edit')}
      ariaLabel={t('editLabel', { name: contact.name })}
      size="sm"
      variant="secondary"
    >
      {(close) => (
        <FormDialog
          title={t('editLabel', { name: contact.name })}
          description={t('bankKeptHint')}
          submitLabel={t('save')}
          schema={UpdateContact}
          fields={fields}
          initial={{
            name: contact.name,
            kinds: contact.kinds.map((kind) => ({ kind })),
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            bin: contact.bin ?? '',
          }}
          transform={(body) => {
            const shaped: Record<string, unknown> = kindList(body);
            // Empty tax and bank fields keep what is stored.
            return Object.fromEntries(Object.entries(shaped).filter(([, value]) => value !== null));
          }}
          note={t('stepUpNote')}
          submit={(body) =>
            browserCall(core.updateContact, {
              params: { id: contact.id },
              body,
              ifMatch: `"${String(contact.meta.version)}"`,
            })
          }
          success={t('saved')}
          invalidate={[core.listContacts.id]}
          onClose={close}
        />
      )}
    </DialogButton>
  );
}

/* Imports ----------------------------------------------------------------------------------- */

/** Upload a file, check it in a dry run, then import it. */
export function ImportButton({
  types,
}: {
  readonly types?: readonly ImportResult['type'][];
}): ReactNode {
  const t = useTranslations('forms');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('importData')}
      </Button>
      {open && (
        <ImportDialog
          types={types ?? ImportType.options}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function ImportDialog({
  types,
  onClose,
}: {
  readonly types: readonly ImportResult['type'][];
  readonly onClose: () => void;
}): ReactNode {
  const t = useTranslations('forms');
  const common = useTranslations('common');
  const uploadError = useUploadError();
  const [type, setType] = useState<ImportResult['type']>(types[0] ?? 'contacts');
  const [picked, setPicked] = useState<File | null>(null);
  const check = useCommand(async (file: File) => {
    const stored = await uploadFile(file, null);
    return browserCall(core.startImport, { body: { type, fileId: stored.id, dryRun: true } });
  });
  const commit = useCommand(
    (result: ImportResult) => browserCall(core.commitImport, { params: { id: result.id } }),
    { success: t('imported'), onSuccess: onClose },
  );
  const result = check.data;
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('importData')}
      description={t('importHint')}
      closeLabel={common('close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {common('cancel')}
          </Button>
          {result === undefined ? (
            <Button
              loading={check.isPending}
              disabled={picked === null}
              onClick={() => {
                if (picked !== null) check.mutate(picked);
              }}
            >
              {t('checkFile')}
            </Button>
          ) : (
            <Button
              loading={commit.isPending}
              disabled={result.rowsTotal === result.rowsWithErrors}
              onClick={() => {
                commit.mutate(result);
              }}
            >
              {t('importRows', { count: result.rowsTotal - result.rowsWithErrors })}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t('fields.importType')}>
          {(control) => (
            <Select
              {...control}
              value={type}
              options={types.map((value) => ({ value, label: t(`importTypes.${value}`) }))}
              onChange={(event) => {
                setType(event.target.value as ImportResult['type']);
              }}
            />
          )}
        </Field>
        <FilePicker label={t('fields.file')} accept="text/csv,.csv,.xlsx" onPick={setPicked} />
        {check.isError && <Callout tone="crit" title={uploadError(check.error)} />}
        {commit.isError && <Callout tone="crit" title={uploadError(commit.error)} />}
        {result !== undefined && (
          <div className="flex flex-col gap-2">
            <Callout
              tone={result.rowsWithErrors === 0 ? 'good' : 'warn'}
              title={t('checkResult', { rows: result.rowsTotal, errors: result.rowsWithErrors })}
            >
              {t('errorsSkipped')}
            </Callout>
            {result.errors.length > 0 && (
              <DataTable
                label={t('rowErrors')}
                rows={result.errors}
                getRowId={(row) => `${String(row.row)}-${row.column ?? ''}`}
                loadingState={null}
                errorState={null}
                emptyState={null}
                columns={[
                  { id: 'row', header: t('fields.row'), align: 'right', cell: (row) => row.row },
                  { id: 'column', header: t('fields.column'), cell: (row) => row.column ?? '—' },
                  { id: 'message', header: t('fields.problem'), cell: (row) => row.message },
                ]}
              />
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
