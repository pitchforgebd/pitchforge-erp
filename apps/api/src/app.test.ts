import 'reflect-metadata';

import { randomBytes } from 'node:crypto';

import { Controller, Get, Post } from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { Health, Problem, Readiness } from '@pitchforge/contracts';

import { AppModule } from './app.module.ts';
import { createApp } from './bootstrap.ts';
import type { AppConfig } from './platform/config/config.ts';
import { ApiError } from './platform/errors/problem.filter.ts';
import type { DependencyChecks } from './platform/health/health.ts';
import { Policy, Public } from './platform/policy/policy.ts';

const config: AppConfig = {
  env: 'test',
  port: 0,
  databaseUrl: 'postgresql://app_rw:local@localhost:5432/pitchforge_test',
  redisUrl: 'redis://localhost:6379',
  sessionSecret: randomBytes(32).toString('base64'),
  fieldEncryptionKey: randomBytes(32).toString('base64'),
  logLevel: 'silent',
  trustedProxyHops: 0,
};

const healthy: DependencyChecks = {
  database: () => Promise.resolve(),
  cache: () => Promise.resolve(),
};

@Controller('sample')
class SampleController {
  @Public('A test route')
  @Get('open')
  public open(): { ok: boolean } {
    return { ok: true };
  }

  @Policy('sample.read')
  @Get('guarded')
  public guarded(): { secret: string } {
    return { secret: 'must not be returned' };
  }

  @Public('A test route')
  @Get('crash')
  public crash(): never {
    throw new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2');
  }

  @Public('A test route')
  @Get('locked')
  public locked(): never {
    throw new ApiError('PERIOD_LOCKED');
  }

  @Public('A test route')
  @Post('echo')
  public echo(): { ok: boolean } {
    return { ok: true };
  }
}

@Controller('forgotten')
class ForgottenController {
  @Get()
  public forgotten(): { data: string } {
    return { data: 'must not be returned' };
  }
}

let running: INestApplication | undefined;

afterEach(async () => {
  await running?.close();
  running = undefined;
});

async function start(checks: DependencyChecks = healthy) {
  running = await createApp({ config, checks, controllers: [SampleController] });
  await running.listen(0, '127.0.0.1');
  return `${await running.getUrl()}/api/v1`;
}

/** Built without createApp, as a mistake would be, to prove the guard alone also refuses. */
async function startWithoutRouteCheck(controller: Type) {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot({ config, checks: healthy, controllers: [controller] })],
  }).compile();
  running = moduleRef.createNestApplication();
  await running.listen(0, '127.0.0.1');
  return await running.getUrl();
}

async function problemFrom(response: Response) {
  expect(response.headers.get('content-type')).toContain('application/problem+json');
  return Problem.parse(await response.json());
}

describe('probes', () => {
  it('health answers 200 with the status alone', async () => {
    const response = await fetch(`${await start()}/health`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(Health.parse(JSON.parse(text))).toEqual({ status: 'ok' });
    expect(text).not.toMatch(/version|node|nest|postgres|redis|localhost/i);
  });

  it('ready answers 200 when both dependencies are up', async () => {
    const response = await fetch(`${await start()}/ready`);
    expect(response.status).toBe(200);
    expect(Readiness.parse(await response.json()).status).toBe('ready');
  });

  it.each([
    ['database', { ...healthy, database: () => Promise.reject(new Error('host db-1 refused')) }],
    ['cache', { ...healthy, cache: () => Promise.reject(new Error('host cache-1 refused')) }],
  ])('ready answers 503 when %s is down, and hides why', async (name, checks) => {
    const response = await fetch(`${await start(checks)}/ready`);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain('refused');
    expect(Readiness.parse(JSON.parse(text)).checks).toMatchObject({ [name]: 'down' });
  });

  it('ready gives up on a dependency that hangs', async () => {
    const hanging = { ...healthy, cache: () => new Promise<void>(() => undefined) };
    const response = await fetch(`${await start(hanging)}/ready`);
    expect(response.status).toBe(503);
  }, 5_000);
});

describe('deny by default', () => {
  it('createApp refuses to start with a route that has no policy', async () => {
    await expect(
      createApp({ config, checks: healthy, controllers: [ForgottenController] }),
    ).rejects.toThrow('ForgottenController.forgotten');
  });

  it('every route of the real app has a policy', async () => {
    await expect(start()).resolves.toContain('/api/v1');
  });

  it('the guard alone refuses a route with no policy: 403', async () => {
    const response = await fetch(`${await startWithoutRouteCheck(ForgottenController)}/forgotten`);
    expect(response.status).toBe(403);
    expect((await problemFrom(response)).code).toBe('FORBIDDEN');
  });

  it('a route with a policy is refused without a session: 401', async () => {
    const response = await fetch(`${await start()}/sample/guarded`);
    expect(response.status).toBe(401);
    const text = await response.clone().text();
    expect(text).not.toContain('must not be returned');
    expect((await problemFrom(response)).code).toBe('UNAUTHENTICATED');
  });

  it('a public route is open', async () => {
    const response = await fetch(`${await start()}/sample/open`);
    expect(response.status).toBe(200);
  });
});

describe('errors', () => {
  it('an unknown route is a problem+json 404 with a request id', async () => {
    const response = await fetch(`${await start()}/nothing/here`);
    expect(response.status).toBe(404);
    const problem = await problemFrom(response);
    expect(problem.code).toBe('NOT_FOUND');
    expect(problem.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get('x-request-id')).toBe(problem.requestId);
  });

  it('an unexpected error reveals nothing', async () => {
    const response = await fetch(`${await start()}/sample/crash`);
    expect(response.status).toBe(500);
    const text = await response.clone().text();
    expect(text).not.toMatch(/ECONNREFUSED|hunter2|10\.0\.0\.5|stack|\.ts/);
    expect((await problemFrom(response)).code).toBe('INTERNAL_ERROR');
  });

  it('a raised contract error keeps its code and status', async () => {
    const response = await fetch(`${await start()}/sample/locked`);
    expect(response.status).toBe(409);
    expect((await problemFrom(response)).code).toBe('PERIOD_LOCKED');
  });

  it('malformed JSON is a validation problem, not a 500', async () => {
    const response = await fetch(`${await start()}/sample/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(response.status).toBe(422);
    expect((await problemFrom(response)).code).toBe('VALIDATION');
  });

  it('a body over the limit is refused', async () => {
    const response = await fetch(`${await start()}/sample/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'x'.repeat(2_000_000) }),
    });
    expect(response.status).toBe(422);
  });
});

describe('request ids', () => {
  it('keeps a caller id that is a UUID', async () => {
    const id = '0190f2a4-7c3b-7d2e-8f00-000000000001';
    const response = await fetch(`${await start()}/nothing`, {
      headers: { 'x-request-id': id },
    });
    expect((await problemFrom(response)).requestId).toBe(id);
  });

  it('replaces anything else, so a header cannot write into the logs', async () => {
    const response = await fetch(`${await start()}/nothing`, {
      headers: { 'x-request-id': 'fake-entry admin logged in' },
    });
    expect((await problemFrom(response)).requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('security headers', () => {
  it('sends the helmet headers and does not name the framework', async () => {
    const { headers } = await fetch(`${await start()}/health`);
    expect(headers.get('x-powered-by')).toBeNull();
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('strict-transport-security')).toContain('max-age=');
    expect(headers.get('content-security-policy')).toContain("default-src 'self'");
  });
});

describe('rate limit', () => {
  it('answers 429 with a problem after the limit, and probes stay open', async () => {
    const base = await start();
    let last: Response | undefined;
    for (let call = 0; call <= 300; call += 1) {
      last = await fetch(`${base}/sample/open`);
      await last.arrayBuffer();
    }
    expect(last?.status).toBe(429);
    const blocked = await fetch(`${base}/sample/open`);
    expect((await problemFrom(blocked)).code).toBe('RATE_LIMITED');
    expect((await fetch(`${base}/health`)).status).toBe(200);
  });
});
