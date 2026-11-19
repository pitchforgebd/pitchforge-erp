import { DomainError } from './domain-error.ts';

/**
 * Outcome of an operation on untrusted input (parsing). Invariant violations inside the
 * domain (e.g. adding two currencies) throw DomainError instead.
 */
export type Result<T, E = DomainError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Shorthand for a VALIDATION failure. */
export function invalid(message: string): Result<never> {
  return err(new DomainError('VALIDATION', message));
}

/** Return the value or throw the error. For tests, seeds and trusted constants only. */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value;
  throw result.error;
}
