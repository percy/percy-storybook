#!/usr/bin/env node
/*
 * Post-build guard: fail if dist/ contains any dev-mode React symbol.
 *
 * The @percy/storybook addon ships a bundle that Storybook's manager rebundles
 * with esbuild and executes against production-minified React (which strips
 * internals dev code assumes exists). Any dev-runtime leak in dist/ means the
 * manager will crash on first render. This script enforces that invariant.
 *
 * Allow-list is SELF-INVALIDATING: each entry names a source file; if that
 * file stops existing, the script fails. Deleting src/react19Shim.js without
 * also pruning ALLOWED_CONTAINERS trips this check.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  'ReactSharedInternals',
  'recentlyCreatedOwnerStacks',
  'getStackAddendum',
  'jsxDEV(',
  'react-jsx-runtime.development',
  '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
  '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
  'jsxWithValidation',
  'printWarning'
];

// Fingerprint uses a property-access string that Terser preserves literally
// (minifiers keep `.propertyName` strings; only identifiers get mangled).
// `ReactDebugCurrentFrame` appears nowhere else in dist/ per audit.
const ALLOWED_CONTAINERS = [
  {
    sourceFile: 'src/react19Shim.js',
    marker: 'ReactDebugCurrentFrame',
    tokens: new Set([
      'ReactSharedInternals',
      '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
      '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
      'getStackAddendum',
      'recentlyCreatedOwnerStacks'
    ])
  }
];

for (const { sourceFile } of ALLOWED_CONTAINERS) {
  if (!existsSync(sourceFile)) {
    console.error(`✗ allow-list references a deleted file: ${sourceFile}`);
    console.error('  Prune scripts/assert-prod-bundle.mjs ALLOWED_CONTAINERS and re-run.');
    process.exit(1);
  }
}

const DIST = 'dist';
const chunksDir = join(DIST, 'chunks');
const files = [
  join(DIST, 'manager.js'),
  ...(existsSync(chunksDir) && statSync(chunksDir).isDirectory()
    ? readdirSync(chunksDir).filter(f => f.endsWith('.js')).map(f => join(chunksDir, f))
    : [])
].filter(existsSync);

if (files.length === 0) {
  console.error('✗ no dist JS files found — did `vite build` run?');
  process.exit(1);
}

function allowedTokensFor(src) {
  const allowed = new Set();
  for (const { marker, tokens } of ALLOWED_CONTAINERS) {
    if (src.includes(marker)) for (const t of tokens) allowed.add(t);
  }
  return allowed;
}

let failed = false;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const allowed = allowedTokensFor(src);
  for (const token of FORBIDDEN) {
    if (src.includes(token) && !allowed.has(token)) {
      console.error(`✗ ${file} contains forbidden token: ${token}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nSee docs/plans/2026-04-23-fix-react-19-storybook-10-compat-plan.md');
  process.exit(1);
}
console.log(`✓ dist/ is production-clean (${files.length} files scanned)`);
