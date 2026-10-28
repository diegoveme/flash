/* global Bun, process, console */
/**
 * Bundles every Lambda handler of apps/api into infra/dist/<function>/index.mjs.
 *
 * Why not `sam build`: SAM's Node.js builders run `npm install` inside apps/api, and npm
 * does not understand the `workspace:*` protocol used by the bun workspaces. Bun's built-in
 * bundler needs no extra dependency and produces one self-contained ESM file per function,
 * which `sam deploy` zips as-is.
 *
 * Usage (repo root): bun infra/scripts/build-lambdas.mjs
 */
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FUNCTIONS } from './functions.mjs';

const infraDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const handlersDir = path.resolve(infraDir, '../apps/api/src/interfaces/http/handlers');
const outRoot = path.join(infraDir, 'dist');

const missing = Object.entries(FUNCTIONS)
  .map(([name, handler]) => ({ name, entry: path.join(handlersDir, `${handler}.js`) }))
  .filter(({ entry }) => !existsSync(entry));

if (missing.length > 0) {
  console.error('Missing handler files:');
  for (const { name, entry } of missing) console.error(`  ${name}: ${entry}`);
  process.exit(1);
}

await rm(outRoot, { recursive: true, force: true });

let failed = false;
for (const [name, handler] of Object.entries(FUNCTIONS)) {
  const result = await Bun.build({
    entrypoints: [path.join(handlersDir, `${handler}.js`)],
    outdir: path.join(outRoot, name),
    naming: 'index.mjs',
    target: 'node',
    format: 'esm',
    minify: true,
    sourcemap: 'linked',
  });

  if (!result.success) {
    failed = true;
    console.error(`${name}: build failed`);
    for (const log of result.logs) console.error(log);
    continue;
  }

  const bundle = result.outputs.find((output) => output.path.endsWith('index.mjs'));
  console.log(`${name.padEnd(32)} ${(bundle.size / 1024).toFixed(0).padStart(6)} KiB`);
}

if (failed) process.exit(1);
console.log(`\nBundles written to ${outRoot}`);
