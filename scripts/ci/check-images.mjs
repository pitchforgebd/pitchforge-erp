// @ts-check
/**
 * Checks a built image. Run by CI: node scripts/ci/check-images.mjs <image> [--no-mocks].
 * The images have no shell, so every check runs inside Node.
 */
import { spawnSync } from 'node:child_process';

const [image, flag] = process.argv.slice(2);
if (image === undefined) throw new Error('Usage: check-images.mjs <image> [--no-mocks]');

const CHECK = `
const fs = require('node:fs');
const path = require('node:path');
const problems = [];
if (process.getuid() === 0) problems.push('runs as root');
for (const target of ['/probe', process.cwd() + '/probe', '/app/probe']) {
  try { fs.writeFileSync(target, 'x'); problems.push('wrote to ' + target); } catch {}
}
for (const tool of ['/bin/sh', '/bin/busybox', '/sbin/apk', '/usr/local/bin/npm']) {
  if (fs.existsSync(tool)) problems.push('found ' + tool);
}
if (process.env.CHECK_NO_MOCKS === 'true') {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name === 'msw') problems.push('found ' + full); walk(full); return; }
    if (!entry.isFile() || !/\\.(js|mjs|cjs|json)$/.test(entry.name)) return;
    if (/setupServer|pitchforge\\.example/.test(fs.readFileSync(full, 'latin1'))) problems.push('mock code in ' + full);
  });
  walk(process.cwd());
}
console.log(JSON.stringify(problems));
process.exit(problems.length === 0 ? 0 : 1);
`;

const { status, stdout, stderr } = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--read-only',
    '--env',
    `CHECK_NO_MOCKS=${String(flag === '--no-mocks')}`,
    image,
    'node',
    '-e',
    CHECK,
  ],
  { encoding: 'utf8' },
);

if (status !== 0) {
  console.error(`✖ ${image}: ${stdout}${stderr}`);
  process.exit(1);
}
console.log(`✔ ${image}: not root, read-only, no shell or package manager`);
