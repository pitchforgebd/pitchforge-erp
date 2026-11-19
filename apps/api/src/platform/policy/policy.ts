import { Inject, Injectable, SetMetadata } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';

import { ApiError } from '../errors/problem.filter.ts';

const POLICY_KEY = 'pitchforge:policy';
const PUBLIC_KEY = 'pitchforge:public';

/** The permission a route needs, such as `accounting.journal.post`. */
export const Policy = (permission: string) => SetMetadata(POLICY_KEY, permission);

/** Open to callers with no session. Needs a reason, and the contract must say `public` too. */
export const Public = (reason: string) => SetMetadata(PUBLIC_KEY, reason);

/**
 * Deny by default (CLAUDE.md rule 5). A route with no decorator is refused, and a route with
 * `@Policy()` is refused too until sessions and the policy engine arrive in step B1: there is
 * no way yet to prove who is calling.
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  private readonly reflector: Reflector;

  public constructor(@Inject(Reflector) reflector: Reflector) {
    this.reflector = reflector;
  }

  public canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<string | undefined>(PUBLIC_KEY, targets) !== undefined)
      return true;

    const permission = this.reflector.getAllAndOverride<string | undefined>(POLICY_KEY, targets);
    throw new ApiError(permission === undefined ? 'FORBIDDEN' : 'UNAUTHENTICATED');
  }
}

/** `Controller.method` for every route with neither `@Policy()` nor `@Public()`. */
export function routesWithoutPolicy(
  discovery: DiscoveryService,
  scanner: MetadataScanner,
  reflector: Reflector,
): string[] {
  const missing: string[] = [];
  for (const { instance, metatype } of discovery.getControllers()) {
    if (typeof instance !== 'object' || typeof metatype !== 'function') continue;
    const prototype = Object.getPrototypeOf(instance) as object;

    for (const name of scanner.getAllMethodNames(prototype)) {
      const handler = Object.getOwnPropertyDescriptor(prototype, name)?.value as object;
      if (reflector.get<unknown>('path', handler as never) === undefined) continue;
      const targets = [handler as never, metatype as never];
      const covered =
        reflector.getAllAndOverride<string | undefined>(POLICY_KEY, targets) !== undefined ||
        reflector.getAllAndOverride<string | undefined>(PUBLIC_KEY, targets) !== undefined;
      if (!covered) missing.push(`${metatype.name}.${name}`);
    }
  }
  return missing;
}
