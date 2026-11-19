import { Controller, Get, Inject, Injectable, Res } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Redis } from 'ioredis';
import pg from 'pg';

import { Health, Readiness } from '@pitchforge/contracts';

import { CONFIG } from '../config/config.ts';
import type { AppConfig } from '../config/config.ts';
import { Public } from '../policy/policy.ts';

const CHECK_TIMEOUT_MS = 2_000;

export const DEPENDENCY_CHECKS = Symbol('DEPENDENCY_CHECKS');

export interface DependencyChecks {
  readonly database: () => Promise<void>;
  readonly cache: () => Promise<void>;
}

/** Real checks; one small pool and one lazy connection, closed on shutdown. */
@Injectable()
export class LiveDependencyChecks implements DependencyChecks, OnModuleInit, OnModuleDestroy {
  private readonly pool: pg.Pool;
  private readonly redis: Redis;

  public constructor(@Inject(CONFIG) config: AppConfig) {
    this.pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 1,
      connectionTimeoutMillis: CHECK_TIMEOUT_MS,
    });
    this.redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: CHECK_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      retryStrategy: () => CHECK_TIMEOUT_MS,
    });
  }

  public onModuleInit(): void {
    // Failures show in the probe; these handlers stop them crashing the process.
    this.pool.on('error', () => undefined);
    this.redis.on('error', () => undefined);
    this.redis.connect().catch(() => undefined);
  }

  public readonly database = async (): Promise<void> => {
    await this.pool.query('SELECT 1');
  };

  public readonly cache = async (): Promise<void> => {
    await this.redis.ping();
  };

  public async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
    await this.pool.end();
  }
}

async function stateOf(check: () => Promise<void>): Promise<'up' | 'down'> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('timeout'));
    }, CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([check(), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

/** Probes answer with the status alone: no version, host or error text. */
@SkipThrottle()
@Controller()
export class HealthController {
  private readonly checks: DependencyChecks;

  public constructor(@Inject(DEPENDENCY_CHECKS) checks: DependencyChecks) {
    this.checks = checks;
  }

  @Public('Load balancer liveness probe')
  @Get('health')
  public health(): Health {
    return Health.parse({ status: 'ok' });
  }

  @Public('Load balancer readiness probe')
  @Get('ready')
  public async ready(@Res({ passthrough: true }) response: Response): Promise<Readiness> {
    const [database, cache] = await Promise.all([
      stateOf(this.checks.database),
      stateOf(this.checks.cache),
    ]);
    const ready = database === 'up' && cache === 'up';
    response.status(ready ? 200 : 503);
    return Readiness.parse({
      status: ready ? 'ready' : 'not_ready',
      checks: { database, cache },
    });
  }
}
