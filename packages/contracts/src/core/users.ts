import { z } from 'zod';

import { Timestamp, Uuid } from '../shared/primitives.ts';
import { AuditMeta, RESTRICTED_KINDS, allowedActions } from '../shared/record.ts';

export const DataScope = z
  .enum(['own', 'team', 'department', 'project', 'all'])
  .meta({ id: 'DataScope' });
export type DataScope = z.infer<typeof DataScope>;

/** Role = what actions; data scope = on which records; field rules = which restricted fields. */
export const RoleGrant = z
  .strictObject({
    area: z.string().regex(/^[a-z][a-z_.]*$/),
    actions: z.array(z.enum(['read', 'create', 'update', 'submit', 'approve', 'delete'])).min(1),
    scope: DataScope,
  })
  .meta({ id: 'RoleGrant' });
export type RoleGrant = z.infer<typeof RoleGrant>;

export const Role = z
  .object({
    id: Uuid,
    name: z.string(),
    description: z.string().nullable(),
    system: z.boolean(),
    grants: z.array(RoleGrant),
    restrictedFields: z.array(z.enum(RESTRICTED_KINDS)),
    allowedActions: allowedActions(['update', 'clone', 'delete']),
    meta: AuditMeta,
  })
  .meta({ id: 'Role' });
export type Role = z.infer<typeof Role>;

export const CreateRole = z
  .strictObject({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(300).nullable(),
    grants: z.array(RoleGrant),
    restrictedFields: z.array(z.enum(RESTRICTED_KINDS)),
  })
  .meta({ id: 'CreateRole' });
export type CreateRole = z.infer<typeof CreateRole>;

export const UpdateRole = CreateRole.partial().meta({ id: 'UpdateRole' });
export type UpdateRole = z.infer<typeof UpdateRole>;

export const CloneRole = z
  .strictObject({ name: z.string().trim().min(2).max(80) })
  .meta({ id: 'CloneRole' });
export type CloneRole = z.infer<typeof CloneRole>;

export const UserStatus = z.enum(['invited', 'active', 'deactivated']).meta({ id: 'UserStatus' });
export type UserStatus = z.infer<typeof UserStatus>;

export const User = z
  .object({
    id: Uuid,
    name: z.string(),
    email: z.email(),
    status: UserStatus,
    roleIds: z.array(Uuid),
    departmentId: Uuid.nullable(),
    twoFactorEnabled: z.boolean(),
    lastLoginAt: Timestamp.nullable(),
    /** Time-boxed auditor and viewer access (CORE-15). */
    accessExpiresAt: Timestamp.nullable(),
    allowedActions: allowedActions(['assign_roles', 'deactivate', 'force_sign_out']),
    meta: AuditMeta,
  })
  .meta({ id: 'User' });
export type User = z.infer<typeof User>;

export const InviteUser = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    roleIds: z.array(Uuid).min(1),
    departmentId: Uuid.nullable(),
    accessExpiresAt: Timestamp.nullable(),
  })
  .meta({ id: 'InviteUser' });
export type InviteUser = z.infer<typeof InviteUser>;

export const AssignRoles = z
  .strictObject({ roleIds: z.array(Uuid).min(1) })
  .meta({ id: 'AssignRoles' });
export type AssignRoles = z.infer<typeof AssignRoles>;

/** Pending approvals move to the delegate; history is kept (CORE-09). */
export const DeactivateUser = z
  .strictObject({ delegateUserId: Uuid })
  .meta({ id: 'DeactivateUser' });
export type DeactivateUser = z.infer<typeof DeactivateUser>;
