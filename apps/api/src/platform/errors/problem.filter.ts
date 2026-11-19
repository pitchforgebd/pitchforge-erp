import { randomUUID } from 'node:crypto';

import { Catch, HttpException, Inject, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { ERROR_STATUS, Problem } from '@pitchforge/contracts';
import type { ErrorCode } from '@pitchforge/contracts';

/** Raise this to answer with a specific contract error code. */
export class ApiError extends HttpException {
  public readonly code: ErrorCode;

  public constructor(code: ErrorCode) {
    // eslint-disable-next-line security/detect-object-injection -- code is the ErrorCode union
    super(code, ERROR_STATUS[code]);
    this.code = code;
  }
}

const CODE_OF_STATUS = new Map<number, ErrorCode>([
  [400, 'VALIDATION'],
  [401, 'UNAUTHENTICATED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [405, 'NOT_FOUND'],
  [413, 'VALIDATION'],
  [415, 'VALIDATION'],
  [422, 'VALIDATION'],
  [429, 'RATE_LIMITED'],
]);

function codeOf(exception: unknown): ErrorCode {
  if (exception instanceof ApiError) return exception.code;
  if (exception instanceof ThrottlerException) return 'RATE_LIMITED';
  if (exception instanceof HttpException) {
    return CODE_OF_STATUS.get(exception.getStatus()) ?? 'INTERNAL_ERROR';
  }
  return 'INTERNAL_ERROR';
}

/**
 * Every error leaves as problem+json with a stable code and a request id: never a stack trace,
 * SQL, an internal path, or the text of an unknown exception (security architecture §4).
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger: Logger;

  public constructor(@Inject(Logger) logger: Logger) {
    this.logger = logger;
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const code = codeOf(exception);
    // eslint-disable-next-line security/detect-object-injection -- code is the ErrorCode union
    const status = ERROR_STATUS[code];
    // The body parser runs before the logger, so a request it refuses has no id yet.
    const { id } = request as { id?: string };
    const requestId = id ?? randomUUID();

    if (status >= 500) {
      // Only the class goes in the log: an exception's message can quote data.
      const name = exception instanceof Error ? exception.name : 'unknown';
      this.logger.error(`Unhandled ${name}`, { requestId });
    }

    const body = Problem.parse({ type: 'about:blank', title: code, status, code, requestId });
    response.status(status).type('application/problem+json').send(JSON.stringify(body));
  }
}
