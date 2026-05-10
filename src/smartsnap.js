import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { logger } from '@percy/cli-command';
import { matchesPattern } from './utils.js';
import { diffLockfileDeps } from './lockfileDiff.js';

// stream-json is CommonJS — load via createRequire to avoid named-import interop issues.
const require = createRequire(import.meta.url);
const { parser } = require('stream-json');
const { pick } = require('stream-json/filters/Pick');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { streamValues } = require('stream-json/streamers/StreamValues');

// Webpack/Vite stats prefix loader-resolved virtual modules with a NUL byte
// (e.g. "\u0000/path/to/file?commonjs-es-import"). Strip it so the path lines
// up with the absolute paths in our file index. Built via String.fromCharCode
// to avoid embedding a control char in source / tripping no-control-regex.
const NULL_CHAR = String.fromCharCode(0);
const stripNull = s => (typeof s === 'string' ? s.replaceAll(NULL_CHAR, '') : s);

// Status poll cadence: 12 attempts × 5s = 1 minute total.
const POLL_INTERVAL_MS = 5000;
const POLL_ATTEMPTS = 12;

// Thrown from any pipeline step that wants to fall back to the full snapshot
// set. The caller in snapshots.js downgrades these to log.info — they're
// expected, user-visible bail conditions, not crashes.
export class SmartSnapBailError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SmartSnapBailError';
  }
}

function git(args) {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${res.stderr || res.stdout || `exit ${res.status}`}`);
  }
  return res.stdout;
}

function gitDiffNames(ref) {
  return git(['diff', '--name-only', `${ref}`, 'HEAD']).split('\n').filter(Boolean);
}

function gitProjectRoot() {
  return git(['rev-parse', '--show-toplevel']).trim();
}

// Paths under these directories are dependencies / framework wiring rather
// than first-party source, so we don't track them in the file index.
const EXCLUDED_DIRS = new Set(['node_modules', '.storybook']);
const isExcluded = relPath => relPath.split(/[/\\]/).some(seg => EXCLUDED_DIRS.has(seg));

// Resolve+index used for `id` and `resolvedFrom` only. Converts absolute paths
// to projectRoot-relative form, then either returns the existing index for that
// path or assigns the next one (= current map size). Paths inside node_modules
// or .storybook are returned as the relative string and *not* indexed; modules
// whose id falls into that bucket are dropped downstream by the
// "id is string → drop" contract in transformModule.
function resolveAndIndex(value, fileIndex, projectRoot) {
  const clean = stripNull(value);
  if (!path.isAbsolute(clean)) return clean;
  const rel = path.relative(projectRoot, clean);
  if (isExcluded(rel)) return rel;
  let idx = fileIndex.get(rel);
  if (idx === undefined) {
    idx = fileIndex.size;
    fileIndex.set(rel, idx);
  }
  return idx;
}

// Transform a stats `modules[]` entry into the indexed shape the SmartSnap graph expects.
// Returns null when the module's id is a string — those entries are dropped (per BE contract).
// Each `imports[i]` / `passThroughExports[i]` carries `{ type, source }` from the
// bundler-plugin: for `type === 'src'` we translate the absolute file path to its
// project-file index when possible; for `type === 'module'` the source is already
// the bare package name, so we leave it alone.
function transformModule(m, fileIndex, projectRoot) {
  const out = {};
  if (m.id != null) out.id = resolveAndIndex(m.id, fileIndex, projectRoot);
  if (typeof out.id === 'string') return null;

  const mapEntry = (e) => {
    const copy = { ...e };
    if (copy.type === 'src' && typeof copy.source === 'string') {
      copy.source = resolveAndIndex(copy.source, fileIndex, projectRoot);
    }
    return copy;
  };

  if (Array.isArray(m.imports)) out.imports = m.imports.map(mapEntry);
  if (Array.isArray(m.passThroughExports)) out.passThroughExports = m.passThroughExports.map(mapEntry);
  if (Array.isArray(m.nonPassThroughExports)) out.nonPassThroughExports = m.nonPassThroughExports;

  return out;
}

function streamModules(filePath, onModule) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parser())
      .pipe(pick({ filter: 'modules' }))
      .pipe(streamArray())
      .on('data', ({ value }) => onModule(value))
      .on('end', resolve)
      .on('error', reject);
  });
}

function readTopLevelKey(filePath, key) {
  return new Promise((resolve, reject) => {
    let value;
    fs.createReadStream(filePath)
      .pipe(parser())
      .pipe(pick({ filter: key }))
      .pipe(streamValues())
      .on('data', ({ value: v }) => { value = v; })
      .on('end', () => resolve(value))
      .on('error', reject);
  });
}

async function readStats(statsFile, projectRoot) {
  const fileIndex = new Map();
  const modules = [];
  await streamModules(statsFile, (m) => {
    const t = transformModule(m, fileIndex, projectRoot);
    if (t) modules.push(t);
  });

  // Emit `files` ordered by encounter-time index so files[N] corresponds to
  // every module/source ref that was assigned index N during streaming.
  const files = [...fileIndex.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([p]) => p);

  // The bundler-plugin-smartsnap emits a unique buildId per storybook build
  // so concurrent runs against the same project don't share Redis state.
  const buildId = await readTopLevelKey(statsFile, 'buildId');
  return { files, modules, buildId };
}

async function pollGraphStatus(percy, buildId, log) {
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const res = await percy.client.getSmartsnapGraphStatus(buildId);
    const status = res?.status;
    log.debug(`SmartSnap: graph status (attempt ${i + 1}) = ${status}`);
    if (status === 'done' || status === 'failure') return status;
  }
  return null;
}

// Given the mapped snapshots and storybook.smartSnap config, returns the subset of snapshots
// that the SmartSnap graph reports as affected. On any recoverable failure, returns the input
// list unchanged so the build runs as a full snapshot pass.
export async function applySmartSnap(percy, snapshots, smartSnapConfig, buildDir) {
  const log = logger('storybook:smartsnap');
  const { baseline, untraced, trace, bailOnChanges, statsFile } = smartSnapConfig || {};


  if (!buildDir) {
    throw new SmartSnapBailError('SmartSnap requires the Storybook build directory (e.g. `percy storybook ./storybook-static`); URL and `start` modes are not supported. Running full snapshot set');
  }

  // Treat statsFile as a flat filename anchored inside the build directory.
  // path.basename() strips any traversal segments so the resolved path can't
  // escape buildDir even if the config is hostile.
  const statsName = path.basename(statsFile || 'enriched-stats.json');
  if (!/^[\w.-]+\.json$/i.test(statsName)) {
    throw new SmartSnapBailError(`SmartSnap: invalid statsFile "${statsName}" — must be a .json filename; running full snapshot set`);
  }
  const resolvedStatsPath = path.join(path.resolve(buildDir), statsName);
  let statsStat;
  try {
    statsStat = fs.statSync(resolvedStatsPath);
  } catch {
    throw new SmartSnapBailError(`SmartSnap: stats file "${statsName}" not found in build directory ${buildDir}; running full snapshot set`);
  }
  if (!statsStat.isFile()) {
    throw new SmartSnapBailError(`SmartSnap: stats file "${statsName}" in ${buildDir} is not a regular file; running full snapshot set`);
  }

  const snapshotNames = snapshots.map(s => s.name);
  // New API shape: `{ base_build_commit_sha, snapshots: { <name>: <review_state> } }`.
  // The single base-build commit replaces the previous per-snapshot commit map —
  // baseline prediction now happens server-side via `Percy::BaseBuildService`,
  // so we just diff against whatever commit it picked.
  const baseLookup = await percy.client.getSmartsnapSnapshotNameToCommit(snapshotNames);
  log.debug(`SmartSnap: base lookup ${JSON.stringify(baseLookup)}`);

  let affectedNodes;
  let baseRef;

  if (baseline) {
    log.debug(`SmartSnap: diffing against explicit baseline "${baseline}"`);
    baseRef = baseline;
  } else if (baseLookup?.base_build_commit_sha) {
    log.debug(`SmartSnap: diffing against predicted base build commit "${baseLookup.base_build_commit_sha}"`);
    baseRef = baseLookup.base_build_commit_sha;
  } else {
    throw new SmartSnapBailError('SmartSnap: API could not predict a base build commit and no explicit baseline was set; running full snapshot set');
  }
  affectedNodes = gitDiffNames(baseRef);

  // HEAD already matches the base build commit (or the diff is otherwise
  // empty) — there's nothing for the dep graph to map. Bail to a full set.
  if (affectedNodes.length === 0) {
    throw new SmartSnapBailError('SmartSnap: no files changed between HEAD and base build commit; running full snapshot set');
  }

  // A change to anything under `.storybook/` (preview config, addons, manager
  // wiring) can affect every story's render, so the dep graph isn't enough.
  const dotStorybookHit = affectedNodes.find(p => p.split(/[/\\]/).includes('.storybook'));
  if (dotStorybookHit) {
    throw new SmartSnapBailError(`SmartSnap: change to "${dotStorybookHit}" inside .storybook affects all stories; running full snapshot set`);
  }

  // Manifest/lockfile changes can shift the dependency tree, so resolve the
  // diff at the package level via snyk-nodejs-lockfile-parser and feed the
  // changed package names back into the graph. Short-circuits below fall
  // back to a full snapshot whenever we can't reason about the change.
  const MANIFEST_PATHS = new Set(['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);
  const manifestHits = affectedNodes.filter(p => MANIFEST_PATHS.has(path.basename(p)));
  const projectRoot = gitProjectRoot();

  if (manifestHits.length > 0) {
    // Locate the changed manifest's directory from affectedNodes (NOT the git
    // root) — monorepos keep package.json + lockfile inside a workspace dir.
    // If two changes land in different dirs, we'd need per-workspace resolution
    // we don't try to do yet, so bail.
    const uniqueDirs = [...new Set(manifestHits.map(p => path.dirname(p)))];
    if (uniqueDirs.length > 1) {
      throw new SmartSnapBailError(`SmartSnap: manifest changes span multiple directories (${uniqueDirs.join(', ')}); running full snapshot set`);
    }
    const manifestDir = uniqueDirs[0]; // repo-relative; '.' for root
    const absManifestDir = path.resolve(projectRoot, manifestDir);

    // Pick the lockfile that lives next to the changed manifest. If two
    // coexist (e.g. a stray package-lock.json next to yarn.lock) we can't
    // pick a canonical source, so bail.
    const LOCKFILE_NAMES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    const presentLockfiles = LOCKFILE_NAMES.filter(n => fs.existsSync(path.join(absManifestDir, n)));
    if (presentLockfiles.length === 0) {
      throw new SmartSnapBailError(`SmartSnap: manifest changed in "${manifestDir}" but no lockfile present there; running full snapshot set`);
    }
    if (presentLockfiles.length > 1) {
      throw new SmartSnapBailError(`SmartSnap: multiple lockfiles in "${manifestDir}" (${presentLockfiles.join(', ')}); cannot pick canonical; running full snapshot set`);
    }
    const lockfileName = presentLockfiles[0];
    // git always uses forward slashes for its <rev>:<path> spec; build it by
    // hand instead of path.join (which would use backslashes on Windows).
    const lockfileRepoPath = manifestDir === '.' ? lockfileName : `${manifestDir}/${lockfileName}`;

    // Resolve the lockfile at the base commit. If it wasn't tracked there
    // (first SmartSnap run, lockfile renamed, etc.) we can't diff, so bail.
    let oldLockfile;
    try {
      oldLockfile = git(['show', `${baseRef}:${lockfileRepoPath}`]);
    } catch {
      throw new SmartSnapBailError(`SmartSnap: lockfile "${lockfileRepoPath}" not present at base ref ${baseRef}; running full snapshot set`);
    }

    const newLockfile = fs.readFileSync(path.join(absManifestDir, lockfileName), 'utf8');

    if (oldLockfile !== newLockfile) {
      // Lockfile actually shifted — invoke the diff. If byte-identical, only
      // package.json's non-dep fields changed and we fall through unchanged.
      const packageJson = fs.readFileSync(path.join(absManifestDir, 'package.json'), 'utf8');
      const packageJsonRepoPath = manifestDir === '.' ? "package.json" : `${manifestDir}/package.json`;
      const oldPackageJson = git(['show', `${baseRef}:${packageJsonRepoPath}`]);
      const packageAffected = await diffLockfileDeps({
        packageJson, oldLockfile, newLockfile, lockfileType: lockfileName,
        oldPackageJson
      });
      log.debug(`SmartSnap: lockfile diff produced ${packageAffected.length} affected packages: ${packageAffected.join(', ')}`);
    }
  }

  if (untraced?.length) {
    affectedNodes = affectedNodes.filter(p => !untraced.some(g => matchesPattern(p, g)));
  }

  if (bailOnChanges?.length) {
    const bailed = affectedNodes.find(p => bailOnChanges.some(g => matchesPattern(p, g)));
    if (bailed) {
      throw new SmartSnapBailError(`SmartSnap: change to "${bailed}" matched bailOnChanges; running full snapshot set`);
    }
  }

  log.debug(`SmartSnap: parsing stats file ${resolvedStatsPath}`);
  const { files, modules, buildId } = await readStats(resolvedStatsPath, projectRoot);

  if (typeof buildId !== 'string' || !buildId) {
    throw new SmartSnapBailError(`SmartSnap: stats file at ${resolvedStatsPath} is missing a top-level "buildId" — running full snapshot set`);
  }

  // Storybook's `parameters.fileName` (and v7+ `entries[id].importPath`)
  // both come back with a leading `./` (or `.\` on Windows) — e.g.
  // `./src/stories/Foo.stories.tsx`. The compactor's `files` array uses
  // `path.relative(projectRoot, ...)` which produces `src/stories/Foo.stories.tsx`
  // with no prefix. Normalize using the platform's separator (and also strip
  // the POSIX form for Storybook builds on Windows that emit `./` regardless).
  const dotPosix = './';
  const dotPlatform = `.${path.sep}`;
  const normalizeImportPath = p => {
    if (typeof p !== 'string') return p;
    if (p.startsWith(dotPlatform)) return p.slice(dotPlatform.length);
    if (p.startsWith(dotPosix)) return p.slice(dotPosix.length);
    return p;
  };

  const storybookPaths = [...new Set(snapshots.map(s => normalizeImportPath(s.importPath)).filter(Boolean))];
  const snapshotsWithImportPath = snapshots.filter(s => s.importPath).length;
  log.debug(`SmartSnap: ${snapshotsWithImportPath}/${snapshots.length} snapshots have importPath; ${storybookPaths.length} unique storybookPaths`);
  if (storybookPaths.length === 0) {
    log.warn(`SmartSnap: no snapshots have importPath set — check Storybook story extraction. Sample snapshot: ${JSON.stringify({
      id: snapshots[0]?.id, name: snapshots[0]?.name, importPath: snapshots[0]?.importPath, keys: snapshots[0] ? Object.keys(snapshots[0]) : []
    })}`);
  } else {
    log.debug(`SmartSnap: storybookPaths sample: ${storybookPaths.slice(0, 3).join(', ')}`);
  }

  log.debug(`SmartSnap: starting graph generation job ${JSON.stringify({ buildId, files, modules, storybookPaths, affectedNodes })}`);
  await percy.client.generateSmartsnapGraph(buildId, {
    files, modules, storybookPaths, affectedNodes
  });

  const status = await pollGraphStatus(percy, buildId, log);
  if (status !== 'done') {
    throw new SmartSnapBailError(`SmartSnap: graph generation did not complete (status: ${status ?? 'timed out'}); running full snapshot set`);
  }

  const data = await percy.client.getSmartsnapGraphData(buildId, { trace: trace });

  // Persist the rendered Drawflow visualization next to where the user ran
  // percy, so they can open it after the build finishes.

  log.debug(`SmartSnap: affected stories result ${JSON.stringify(data?.affected_stories)}`);

  if (data?.trace_graph_html) {
    const tracePath = path.resolve(process.cwd(), 'trace.html');
    try {
      fs.writeFileSync(tracePath, data.trace_graph_html);
      log.info(`SmartSnap: trace written to ${tracePath}`);
    } catch (e) {
      log.warn(`SmartSnap: failed to write trace.html: ${e.message}`);
    }
  }

  const affected = new Set((data?.affected_stories || []).map(s => s.file_path));

  // Snapshots whose baseline review_state is `failed` or `rejected` have no
  // usable baseline image to diff against, and snapshots that don't appear
  // in the base build at all are brand-new (no baseline exists yet). In
  // both cases SmartSnap can't legitimately skip them — re-snapshot
  // unconditionally regardless of what the affected-graph reports.
  const baselineSnapshots = baseLookup?.snapshots || {};
  const FORCE_RESNAPSHOT_STATES = new Set(['failed', 'rejected']);
  const needsBaselineRefresh = name => {
    const state = baselineSnapshots[name];
    return state === undefined || FORCE_RESNAPSHOT_STATES.has(state);
  };

  // Use the same normalization on lookup so a snapshot's `./src/...` matches
  // an affected-stories `src/...` from the API.
  let forced = 0;
  let affectedKept = 0;
  const filtered = snapshots.filter(s => {
    if (needsBaselineRefresh(s.name)) {
      forced += 1;
      return true;
    }
    const p = normalizeImportPath(s.importPath);
    if (p && affected.has(p)) {
      affectedKept += 1;
      return true;
    }
    return false;
  });
  log.info(`SmartSnap: ${filtered.length} of ${snapshots.length} snapshots kept (${affectedKept} via affected-graph, ${forced} via missing/failed/rejected baseline)`);
  return filtered;
}
