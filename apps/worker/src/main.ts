import 'reflect-metadata';

import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { pino } from 'pino';

import { loadConfig } from './config.ts';
import { QueueRunner, WORKER_CONFIG } from './queues.ts';

@Module({})
class WorkerModule {}

const config = loadConfig(process.env);
const logger = pino({ level: config.logLevel });

const root: DynamicModule = {
  module: WorkerModule,
  providers: [{ provide: WORKER_CONFIG, useValue: config }, QueueRunner],
};
const app = await NestFactory.createApplicationContext(root, { logger: false });
app.enableShutdownHooks();
logger.info('worker started');
