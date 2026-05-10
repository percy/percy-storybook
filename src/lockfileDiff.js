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

// Given the project's package.json plus the old and new lockfile contents,
// return the set of package names that were added, removed, or version-bumped.
// The caller forwards these as additional `affectedNodes` to the SmartSnap
// graph API, which already accepts package names alongside file paths.
export async function diffLockfileDeps({ packageJson, oldLockfile, newLockfile, lockfileType }) {
  const type = TYPE_BY_FILENAME[lockfileType];
  if (!type) {
    throw new Error(`Unsupported lockfile type: ${lockfileType}`);
  }

  const [oldTree, newTree] = await Promise.all([
    buildDepTree(packageJson, oldLockfile, true, type),
    buildDepTree(packageJson, newLockfile, true, type)
  ]);

  const oldPkgs = flattenPkgTree(oldTree);
  const newPkgs = flattenPkgTree(newTree);

  const affected = new Set();
  for (const [name, version] of newPkgs) {
    if (!oldPkgs.has(name) || oldPkgs.get(name) !== version) affected.add(name);
  }
  for (const [name] of oldPkgs) {
    if (!newPkgs.has(name)) affected.add(name);
  }
  return [...affected];
}
