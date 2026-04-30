#!/usr/bin/env node
/*
 * Post-build guard: fail if dist/ contains any dev-mode React symbol.
 *
 * The @percy/storybook addon ships a bundle that Storybook's manager rebundles
 * with esbuild and executes against production-minified React (which strips
 * internals dev code assumes exists). Any dev-runtime leak in dist/ means the
 * manager will crash on first render. This script enforces that invariant.
 *
 * No allow-list: vite.config.mjs intentionally bundles React's PROD jsx-runtime
 * (see the comment on the externals array there). With that in place, none of
 * the FORBIDDEN tokens should appear anywhere in dist/.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` is legitimately accessed
// by React 18's PROD jsx-runtime (`...ReactCurrentOwner.current`), which we now
// bundle. It is therefore NOT forbidden. Everything else here is dev-only.
const FORBIDDEN = [
  'recentlyCreatedOwnerStacks',
  'getStackAddendum',
  'jsxDEV(',
  'react-jsx-runtime.development',
  '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
  'jsxWithValidation',
  'printWarning'
];

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

let failed = false;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const token of FORBIDDEN) {
    if (src.includes(token)) {
      console.error(`✗ ${file} contains forbidden token: ${token}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nSee docs/plans/2026-04-30-fix-bundle-prod-jsx-runtime-storybook10-plan.md');
  process.exit(1);
}
console.log(`✓ dist/ is production-clean (${files.length} files scanned)`);
