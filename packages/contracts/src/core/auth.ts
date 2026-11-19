import { z } from 'zod';

import { Timestamp, Uuid } from '../shared/primitives.ts';

/*
 * No token ever appears in a response body. The session is an opaque ID in an HTTP-only
 * cookie (ADR-0004), including the short-lived partial session between password and 2FA.
 */

export const Password = z.string().min(12).max(128);
const TotpCode = z.string().regex(/^[0-9]{6}$/, 'A code has 6 digits');
const RecoveryCode = z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Not a recovery code');

export const LoginRequest = z
  .strictObject({ email: z.email().max(254), password: z.string().min(1).max(128) })
  .meta({ id: 'LoginRequest' });
export type LoginRequest = z.infer<typeof LoginRequest>;

/** The signed-in user, as the web app needs it. No roles-based logic: see `permissions`. */
export const CurrentSession = z
  .object({
    userId: Uuid,
    name: z.string(),
    email: z.email(),
    /** Permission codes, used only to show or hide navigation; the API enforces each call. */
    permissions: z.array(z.string()),
    twoFactorEnabled: z.boolean(),
    idleExpiresAt: Timestamp,
    absoluteExpiresAt: Timestamp,
  })
  .meta({ id: 'CurrentSession' });
export type CurrentSession = z.infer<typeof CurrentSession>;

export const LoginResult = z
  .discriminatedUnion('status', [
    z.object({ status: z.literal('authenticated'), session: CurrentSession }),
    z.object({ status: z.literal('two_factor_required') }),
    z.object({ status: z.literal('two_factor_enrolment_required') }),
  ])
  .meta({ id: 'LoginResult' });
export type LoginResult = z.infer<typeof LoginResult>;

export const VerifyTwoFactorRequest = z
  .strictObject({ code: TotpCode.optional(), recoveryCode: RecoveryCode.optional() })
  .refine((v) => (v.code === undefined) !== (v.recoveryCode === undefined), {
    message: 'Send either a code or a recovery code',
  })
  .meta({ id: 'VerifyTwoFactorRequest' });
export type VerifyTwoFactorRequest = z.infer<typeof VerifyTwoFactorRequest>;

/** Shown once, for the authenticator app. */
export const TwoFactorEnrolment = z
  .object({ otpauthUri: z.string().startsWith('otpauth://totp/') })
  .meta({ id: 'TwoFactorEnrolment' });
export type TwoFactorEnrolment = z.infer<typeof TwoFactorEnrolment>;

export const ConfirmTwoFactorRequest = z
  .strictObject({ code: TotpCode })
  .meta({ id: 'ConfirmTwoFactorRequest' });
export type ConfirmTwoFactorRequest = z.infer<typeof ConfirmTwoFactorRequest>;

/** Recovery codes are shown once and never again. */
export const TwoFactorConfirmed = z
  .object({ session: CurrentSession, recoveryCodes: z.array(RecoveryCode).min(8) })
  .meta({ id: 'TwoFactorConfirmed' });
export type TwoFactorConfirmed = z.infer<typeof TwoFactorConfirmed>;

export const RequestPasswordReset = z
  .strictObject({ email: z.email().max(254) })
  .meta({ id: 'RequestPasswordReset' });
export type RequestPasswordReset = z.infer<typeof RequestPasswordReset>;

export const ResetPassword = z
  .strictObject({ token: z.string().min(32).max(512), newPassword: Password })
  .meta({ id: 'ResetPassword' });
export type ResetPassword = z.infer<typeof ResetPassword>;

export const ChangePassword = z
  .strictObject({ currentPassword: z.string().min(1).max(128), newPassword: Password })
  .meta({ id: 'ChangePassword' });
export type ChangePassword = z.infer<typeof ChangePassword>;

export const StepUpRequest = z
  .strictObject({ password: z.string().min(1).max(128).optional(), code: TotpCode.optional() })
  .refine((v) => (v.password === undefined) !== (v.code === undefined), {
    message: 'Send either a password or a code',
  })
  .meta({ id: 'StepUpRequest' });
export type StepUpRequest = z.infer<typeof StepUpRequest>;

export const StepUpResult = z.object({ validUntil: Timestamp }).meta({ id: 'StepUpResult' });
export type StepUpResult = z.infer<typeof StepUpResult>;

/** One signed-in device, in the user's own device list (CORE-10). */
export const DeviceSession = z
  .object({
    id: Uuid,
    device: z.string(),
    ipAddress: z.string(),
    lastSeenAt: Timestamp,
    current: z.boolean(),
  })
  .meta({ id: 'DeviceSession' });
export type DeviceSession = z.infer<typeof DeviceSession>;
