#!/usr/bin/env node
/** pnpm contracts:openapi: write openapi/openapi.v1.json (committed, so changes show in review). */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildOpenApi } from './build-openapi.ts';

const outDir = path.join(import.meta.dirname, '..', 'openapi');
mkdirSync(outDir, { recursive: true });

const document = buildOpenApi();
const outFile = path.join(outDir, 'openapi.v1.json');
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);

const operations = Object.values(document.paths ?? {}).flatMap((item) => Object.keys(item));
const schemas = Object.keys(document.components?.schemas ?? {});
console.log(
  `✔ ${path.relative(process.cwd(), outFile)}: ${String(operations.length)} operations, ${String(schemas.length)} schemas`,
);
