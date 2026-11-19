import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import type { AppConfig } from '../config/config.ts';

/**
 * Logs never hold secrets or personal data (CLAUDE.md rule 5). Bodies are not logged at all;
 * these paths catch what a developer might log by hand.
 */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.token',
  '*.secret',
  '*.nid',
  '*.tin',
  '*.bankAccount',
  '*.accountNumber',
  '*.salary',
  '*.email',
  '*.phone',
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The id errors and logs share. A caller's id is kept only if it is a UUID, so nobody can write
 * arbitrary text into our logs through a header.
 */
export function requestIdOf(request: IncomingMessage, response: ServerResponse): string {
  const given = request.headers['x-request-id'];
  const id = typeof given === 'string' && UUID.test(given) ? given : randomUUID();
  response.setHeader('x-request-id', id);
  return id;
}

export function loggingModule(config: AppConfig): DynamicModule {
  return LoggerModule.forRoot({
    pinoHttp: {
      level: config.logLevel,
      genReqId: requestIdOf,
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
      // Probes run every few seconds and say nothing useful.
      autoLogging: { ignore: (request) => /\/(health|ready)$/.test(request.url ?? '') },
      serializers: {
        req: (request: { id: string; method: string; url: string }) => ({
          id: request.id,
          method: request.method,
          // Query strings can carry search terms or names.
          url: request.url.split('?')[0],
        }),
        res: (response: { statusCode: number }) => ({ statusCode: response.statusCode }),
      },
    },
  });
}
