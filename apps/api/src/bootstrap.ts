import { DiscoveryService, MetadataScanner, NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.ts';
import type { AppOptions } from './app.module.ts';
import { routesWithoutPolicy } from './platform/policy/policy.ts';

/** Bodies are small JSON; files go straight to object storage. */
const BODY_LIMIT = '1mb';

/** Builds the app. A route with no policy stops the start, so it can never reach production. */
export async function createApp(options: AppOptions): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(options), {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));
  app.disable('x-powered-by');
  app.set('trust proxy', options.config.trustedProxyHops);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.useBodyParser('json', { limit: BODY_LIMIT, type: 'application/json' });
  app.enableShutdownHooks();

  const missing = routesWithoutPolicy(
    app.get(DiscoveryService),
    new MetadataScanner(),
    app.get(Reflector),
  );
  if (missing.length > 0) {
    throw new Error(`Routes without @Policy() or @Public(): ${missing.join(', ')}`);
  }
  return app;
}
