import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const DOCKER = path.join(import.meta.dirname, '../../infra/docker');
const read = (file: string) => readFileSync(path.join(DOCKER, file), 'utf8');

const compose = read('compose.yaml');
const dockerfiles = readdirSync(DOCKER).filter((file) => file.endsWith('.Dockerfile'));

/** The text of each service under `services:`. */
function services(): [string, string][] {
  const block = compose.slice(compose.indexOf('services:'), compose.indexOf('\nvolumes:\n'));
  return block
    .split(/^ {2}(?=[a-z]+:$)/m)
    .slice(1)
    .map((text) => [text.split(':')[0] ?? '', text]);
}

describe('local stack', () => {
  it('has the four services', () => {
    expect(services().map(([name]) => name)).toEqual(['postgres', 'cache', 'storage', 'mail']);
  });

  it.each(services())('%s pins its image by digest', (_name, text) => {
    expect(text).toMatch(/image: \S+:\S+@sha256:[0-9a-f]{64}/);
  });

  it.each(services())('%s binds its ports to localhost only', (_name, text) => {
    const ports = [...text.matchAll(/^ {6}- (\S+:\d+:\d+)$/gm)].map((m) => m[1] ?? '');
    expect(ports.length).toBeGreaterThan(0);
    for (const port of ports) expect(port).toMatch(/^127\.0\.0\.1:/);
  });

  it.each(services())('%s has a healthcheck', (_name, text) => {
    expect(text).toContain('healthcheck:');
  });

  it('has no credentials of its own: they come from .env, and must be set', () => {
    const secrets = [...compose.matchAll(/(PASSWORD|SECRET)[A-Z_]*: (.+)$/gm)].map((m) => m[2]);
    expect(secrets.length).toBeGreaterThan(0);
    for (const value of secrets) expect(value).toMatch(/^\$\{[A-Z_]+:\?/);
  });

  it('every variable it needs is in .env.example', () => {
    const example = readFileSync(path.join(DOCKER, '../../.env.example'), 'utf8');
    const needed = new Set([...compose.matchAll(/\$\{([A-Z_]+):\?/g)].map((m) => m[1] ?? ''));
    for (const name of needed) expect(example).toContain(`${name}=`);
  });
});

describe('images', () => {
  it('there are three', () => {
    expect(dockerfiles.sort()).toEqual(['api.Dockerfile', 'web.Dockerfile', 'worker.Dockerfile']);
  });

  it.each(dockerfiles)('%s pins every base image by digest', (file) => {
    const from = read(file).match(/^FROM .+$/gm) ?? [];
    expect(from.length).toBe(2);
    for (const line of from) expect(line).toMatch(/^FROM \S+:\S+@sha256:[0-9a-f]{64} AS /);
  });

  it.each(dockerfiles)('%s ends as a non-root user with no shell', (file) => {
    const text = read(file);
    const runtime = text.slice(text.lastIndexOf('FROM '));
    expect(runtime).toContain('USER 10001:10001');
    expect(runtime).toContain('/bin/busybox rm -f /bin/busybox');
    expect(runtime.indexOf('/bin/busybox rm')).toBeLessThan(runtime.indexOf('USER '));
    expect(runtime.indexOf('USER ')).toBeLessThan(runtime.indexOf('CMD '));
  });

  it('the build context leaves out secrets', () => {
    const ignore = readFileSync(path.join(DOCKER, '../../.dockerignore'), 'utf8');
    for (const entry of ['.git', '.env', '**/*.pem', '**/*.key', '**/*.tfvars']) {
      expect(ignore.split('\n')).toContain(entry);
    }
  });
});
