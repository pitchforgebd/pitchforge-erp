// @ts-check
/**
 * Builds the web app for cPanel shared hosting (ADR-0013): `pnpm build:cpanel`.
 *
 * Next.js's standalone output keeps pnpm's symlinks, which point at absolute paths on the build
 * machine and break once uploaded. This copies it into a plain folder with one flat
 * node_modules and no symlinks, then packs it as dist/cpanel/pitchforge-web.tar.gz.
 *
 * The result runs the mock API only. It holds fictional sample data and no secrets.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { bundleProblems } from '../ci/bundle-rules.mjs';

const ROOT = path.join(import.meta.dirname, '..', '..');
const WEB = path.join(ROOT, 'apps', 'web');
const STANDALONE = path.join(WEB, '.next', 'standalone');
const OUT_DIR = path.join(ROOT, 'dist', 'cpanel');
const APP = path.join(OUT_DIR, 'pitchforge-web');
const ARCHIVE = path.join(OUT_DIR, 'pitchforge-web.tar.gz');

/** Native image tools built for the build machine's platform. The app uses no next/image. */
const LEFT_OUT = /^(sharp|@img\/.+)$/;

/**
 * Every package in a pnpm store folder, as [name, real directory].
 * @param {string} storeDir
 * @returns {[string, string][]}
 */
export function storePackages(storeDir) {
  /** @type {[string, string][]} */
  const found = [];
  for (const entry of readdirSync(storeDir)) {
    if (entry === 'node_modules') continue;
    const modules = path.join(storeDir, entry, 'node_modules');
    for (const name of readdirSync(modules)) {
      const names = name.startsWith('@')
        ? readdirSync(path.join(modules, name)).map((inner) => `${name}/${inner}`)
        : [name];
      for (const full of names) {
        const dir = path.join(modules, full);
        // Symlinks are dependencies of this package; the package itself is the real folder.
        if (!lstatSync(dir).isSymbolicLink()) found.push([full, dir]);
      }
    }
  }
  return found;
}

/**
 * Fails if two versions of one package would need the same place in a flat node_modules.
 * @param {readonly [string, string][]} packages
 * @returns {Map<string, string>}
 */
export function flatLayout(packages) {
  /** @type {Map<string, string>} */
  const byName = new Map();
  for (const [name, dir] of packages) {
    if (LEFT_OUT.test(name)) continue;
    if (byName.has(name))
      throw new Error(`Two copies of ${name}: a flat node_modules cannot hold both`);
    byName.set(name, dir);
  }
  return byName;
}

/** @param {string} dir */
function symlinksUnder(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) =>
    entry.isSymbolicLink(),
  );
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {Record<string, string>} [env]
 * @param {string} [cwd]
 */
function run(command, args, env = {}, cwd = ROOT) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
}

function build() {
  rmSync(path.join(WEB, '.next'), { recursive: true, force: true });
  run('pnpm', ['--filter', '@pitchforge/web', 'run', 'build'], {
    BUILD_STANDALONE: 'true',
    BUILD_WITHOUT_MOCKS: 'false',
    NEXT_TELEMETRY_DISABLED: '1',
  });

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(path.join(APP, 'node_modules'), { recursive: true });

  // The server and the app folder, without the symlinked node_modules inside it.
  cpSync(path.join(STANDALONE, 'apps', 'web'), path.join(APP, 'apps', 'web'), {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}apps${path.sep}web${path.sep}node_modules`),
  });
  cpSync(path.join(WEB, '.next', 'static'), path.join(APP, 'apps', 'web', '.next', 'static'), {
    recursive: true,
  });

  const layout = flatLayout(storePackages(path.join(STANDALONE, 'node_modules', '.pnpm')));
  for (const [name, dir] of layout) {
    cpSync(realpathSync(dir), path.join(APP, 'node_modules', name), {
      recursive: true,
      dereference: true,
    });
  }

  // Passenger starts this file. It loads the ES module server through require(), which
  // Node 22.12 and later support.
  writeFileSync(
    path.join(APP, 'app.cjs'),
    "// Started by cPanel's Node.js app (Passenger). See docs/05-engineering/cpanel-staging.md.\nrequire('./apps/web/server.js');\n",
  );

  const links = symlinksUnder(APP);
  if (links.length > 0) throw new Error(`Symlinks left in the package: ${links.length}`);

  const leaks = readdirSync(path.join(APP, 'apps', 'web', '.next', 'static'), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.js'))
    .flatMap((file) =>
      bundleProblems(readFileSync(path.join(APP, 'apps', 'web', '.next', 'static', file), 'utf8')),
    );
  if (leaks.length > 0)
    throw new Error(`Client bundle problems: ${[...new Set(leaks)].join(', ')}`);

  // Relative names: GNU tar reads `C:` in a Windows path as a remote host.
  run('tar', ['-czf', path.basename(ARCHIVE), path.basename(APP)], {}, OUT_DIR);
  console.log(`✔ ${path.relative(ROOT, ARCHIVE)}: ${String(layout.size)} packages, no symlinks`);
}

if (process.argv[1] === import.meta.filename) {
  if (!existsSync(path.join(WEB, 'package.json'))) throw new Error('Run from the repository');
  build();
}
