import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

import type { WorkerConfig } from './config.ts';

export const WORKER_CONFIG = Symbol('WORKER_CONFIG');

/** Proves the connection and the shutdown path. Phase 2 adds the real queues. */
export const NOOP_QUEUE = 'platform-noop';

export const noopJob = (): Promise<{ done: true }> => Promise.resolve({ done: true });

@Injectable()
export class QueueRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly connection: Redis;
  private queue: Queue | undefined;
  private worker: Worker | undefined;

  public constructor(@Inject(WORKER_CONFIG) config: WorkerConfig) {
    // BullMQ blocks on this connection, so it must not give up on a slow command.
    this.connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
  }

  public async onApplicationBootstrap(): Promise<void> {
    await this.connection.connect();
    this.queue = new Queue(NOOP_QUEUE, { connection: this.connection });
    this.worker = new Worker(NOOP_QUEUE, noopJob, { connection: this.connection });
    await this.worker.waitUntilReady();
  }

  /** Finishes the job in hand, then closes: a deploy must never cut a job in half. */
  public async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    this.connection.disconnect();
  }
}
