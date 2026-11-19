#!/usr/bin/env node
/**
 * pnpm contracts:diff: fail on a breaking API change without a major version bump, compared
 * with the last contracts-v* tag. Uses oasdiff, which is required in CI; locally it runs if
 * `oasdiff` or Docker is available and otherwise prints a warning.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { SPEC_PATH, breakingChangeAllowed, latestContractTag } from './diff-openapi-lib.ts';

const OASDIFF_IMAGE =
  process.env['OASDIFF_IMAGE'] ??
  'tufin/oasdiff:v1.35.0@sha256:82b1840a77335562bb11ce95f77ad31745a0c6f3a770929333ed1c5ef466e400';
const isCI = process.env['CI'] === 'true';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

const tag = latestContractTag(git('tag', '--list', 'contracts-v*', '--sort=-v:refname'));
if (tag === null) {
  console.log('No contracts-v* tag yet, so there is nothing to compare with.');
  process.exit(0);
}

const works = (cmd: string, args: string[]) =>
  spawnSync(cmd, args, { stdio: 'ignore' }).status === 0;

function comparison(baseFile: string): { cmd: string; args: string[] } | null {
  const relativeBase = path.relative(root, baseFile).split(path.sep).join('/');
  const args = ['breaking', relativeBase, SPEC_PATH, '--fail-on', 'ERR'];
  if (works('oasdiff', ['--version'])) return { cmd: 'oasdiff', args };
  if (works('docker', ['version'])) {
    return {
      cmd: 'docker',
      args: ['run', '--rm', '-v', `${root}:/specs`, '-w', '/specs', OASDIFF_IMAGE, ...args],
    };
  }
  return null;
}

// Inside the repository, so Docker can see it through the mount.
const tempDir = mkdtempSync(path.join(root, '.contracts-diff-'));
let exitCode = 0;
try {
  const baseFile = path.join(tempDir, 'base.json');
  const baseText = git('show', `${tag}:${SPEC_PATH}`);
  writeFileSync(baseFile, baseText);

  const baseVersion = (JSON.parse(baseText) as { info: { version: string } }).info.version;
  const newVersion = (
    JSON.parse(readFileSync(path.join(root, SPEC_PATH), 'utf8')) as { info: { version: string } }
  ).info.version;

  const tool = comparison(baseFile);
  if (tool === null) {
    const message = 'neither oasdiff nor Docker is available';
    if (isCI) {
      console.error(`✖ contracts:diff is required in CI but ${message}`);
      exitCode = 1;
    } else {
      console.warn(`⚠ contracts:diff skipped locally: ${message}. CI always runs it.`);
    }
  } else if (spawnSync(tool.cmd, tool.args, { cwd: root, stdio: 'inherit' }).status === 0) {
    console.log(`✔ no breaking changes since ${tag}`);
  } else if (breakingChangeAllowed(baseVersion, newVersion)) {
    console.log(`Breaking changes accepted: major bump ${baseVersion} → ${newVersion}.`);
  } else {
    console.error(`✖ Breaking change since ${tag} without a major bump (${newVersion}).`);
    exitCode = 1;
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
process.exit(exitCode);
