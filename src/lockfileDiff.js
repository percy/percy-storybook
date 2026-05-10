import { createRequire } from 'module';

// snyk-nodejs-lockfile-parser is CommonJS. Load via createRequire so the
// named imports resolve correctly under "type": "module".
const require = createRequire(import.meta.url);
const { buildDepTree, LockfileType } = require('snyk-nodejs-lockfile-parser');

// Map the on-disk filename to snyk's LockfileType enum. yarn.lock could be
// either yarn classic (v1) or berry (v2+); we default to yarn v1 here and
// can refine by sniffing the lockfile header in a follow-up if needed.
const TYPE_BY_FILENAME = {
  'package-lock.json': LockfileType.npm,
  'yarn.lock': LockfileType.yarn,
  'pnpm-lock.yaml': LockfileType.pnpm
};

// Walk snyk's PkgTree (a recursive `{ name, version, dependencies: { ... } }`
// structure) into a flat `Map<name, version>` of every resolved package.
// We dedupe by name on first sight — multiple versions of the same package
// in the tree get collapsed to the first one encountered, which is fine for
// the diff because we only care about whether *something* about the package
// changed between old and new.
function flattenPkgTree(tree) {
  const out = new Map();
  const walk = node => {
    if (!node?.dependencies) return;
    for (const [name, child] of Object.entries(node.dependencies)) {
      if (!out.has(name)) out.set(name, child.version);
      walk(child);
    }
  };
  walk(tree);
  return out;
}

// Pull `{ name -> rangeString }` from a raw package.json's `dependencies`
// and `peerDependencies` blocks. devDeps and optionalDeps are intentionally
// excluded — only runtime-relevant top-level packages count. Returns {} on
// parse failure so the diff falls through to lockfile-only signal.
function topLevelDeps(packageJsonContents) {
  try {
    const pkg = JSON.parse(packageJsonContents);
    return {
      ...(pkg.dependencies || {}),
      ...(pkg.peerDependencies || {})
    };
  } catch {
    return {};
  }
}

// Given the project's package.json plus the old and new lockfile contents,
// return the set of package names that were added, removed, or version-bumped.
// Results are restricted to packages declared at the top level (dependencies
// or peerDependencies) of either old or new package.json — transitives ride
// along on direct-dep bumps and the BE module graph already resolves them
// from stats `imports[]`, so surfacing them here would just be noise.
//
// Two complementary diffs run, both gated by top-level names:
//   1. Resolved-version diff over the snyk PkgTree — catches lockfile entries
//      whose version actually changed.
//   2. Range-string diff over package.json — catches the case where a user
//      bumped `^5.8.3` to `^5.18.0` but the lockfile already resolved to
//      5.18.0 under the old range, so the resolved tree looks identical.
export async function diffLockfileDeps({ packageJson, oldPackageJson, oldLockfile, newLockfile, lockfileType }) {
  const type = TYPE_BY_FILENAME[lockfileType];
  if (!type) {
    throw new Error(`Unsupported lockfile type: ${lockfileType}`);
  }

  const [oldTree, newTree] = await Promise.all([
    buildDepTree(oldPackageJson, oldLockfile, true, type),
    buildDepTree(packageJson, newLockfile, true, type)
  ]);

  const oldPkgs = flattenPkgTree(oldTree);
  const newPkgs = flattenPkgTree(newTree);

  const oldTopLevel = topLevelDeps(oldPackageJson);
  const newTopLevel = topLevelDeps(packageJson);
  const topLevelNames = new Set([...Object.keys(oldTopLevel), ...Object.keys(newTopLevel)]);

  const affected = new Set();
  for (const [name, version] of newPkgs) {
    if (!topLevelNames.has(name)) continue;
    if (!oldPkgs.has(name) || oldPkgs.get(name) !== version) affected.add(name);
  }
  for (const [name] of oldPkgs) {
    if (!topLevelNames.has(name)) continue;
    if (!newPkgs.has(name)) affected.add(name);
  }

  // Range-string diff is inherently top-level since it iterates package.json
  // directly. `!==` between the strings (or undefined) covers added, removed,
  // and changed in a single comparison.
  for (const name of topLevelNames) {
    if (oldTopLevel[name] !== newTopLevel[name]) affected.add(name);
  }

  return [...affected];
}
