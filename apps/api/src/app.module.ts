import { Logger, Module } from '@nestjs/common';
import type { DynamicModule, Type } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, DiscoveryModule } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { CONFIG } from './platform/config/config.ts';
import type { AppConfig } from './platform/config/config.ts';
import { ProblemFilter } from './platform/errors/problem.filter.ts';
import {
  DEPENDENCY_CHECKS,
  HealthController,
  LiveDependencyChecks,
} from './platform/health/health.ts';
import type { DependencyChecks } from './platform/health/health.ts';
import { loggingModule } from './platform/logging/logging.ts';
import { PolicyGuard } from './platform/policy/policy.ts';

const RATE_LIMIT = { name: 'default', ttl: 60_000, limit: 300 };

export interface AppOptions {
  readonly config: AppConfig;
  /** Replaces the live database and cache checks in tests. */
  readonly checks?: DependencyChecks;
  /** More controllers, for tests of the global guards. */
  readonly controllers?: readonly Type[];
}

@Module({})
export class AppModule {
  public static forRoot({ config, checks, controllers = [] }: AppOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [
        DiscoveryModule,
        loggingModule(config),
        ThrottlerModule.forRoot({ throttlers: [RATE_LIMIT] }),
      ],
      controllers: [HealthController, ...controllers],
      providers: [
        Logger,
        { provide: CONFIG, useValue: config },
        checks === undefined
          ? { provide: DEPENDENCY_CHECKS, useClass: LiveDependencyChecks }
          : { provide: DEPENDENCY_CHECKS, useValue: checks },
        { provide: APP_FILTER, useClass: ProblemFilter },
        // Order matters: limit first, so a flood of refused calls is limited as well.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: PolicyGuard },
      ],
    };
  }
}
