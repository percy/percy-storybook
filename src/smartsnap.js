import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { logger } from '@percy/cli-command';
import { matchesPattern } from './utils.js';

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
// `from` is left as-is because it's the bundler's symbolic source (e.g. '@mui/material',
// '../Button.jsx') — the resolved absolute path lives in `resolvedFrom`.
function transformModule(m, fileIndex, projectRoot) {
  const out = {};
  if (m.id != null) out.id = resolveAndIndex(m.id, fileIndex, projectRoot);
  if (typeof out.id === 'string') return null;

  const mapRefs = (arr) => arr.map((ref) => {
    const copy = { ...ref };
    if (typeof copy.resolvedFrom === 'string') copy.resolvedFrom = resolveAndIndex(copy.resolvedFrom, fileIndex, projectRoot);
    return copy;
  });

  if (Array.isArray(m.imports)) out.imports = mapRefs(m.imports);
  if (Array.isArray(m.passThroughExports)) out.passThroughExports = mapRefs(m.passThroughExports);
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
  // every module/resolvedFrom that was assigned index N during streaming.
  const files = [...fileIndex.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([p]) => p);

  const packageMapping = await readTopLevelKey(statsFile, 'package_mapping');
  // The bundler-plugin-smartsnap emits a unique buildId per storybook build
  // so concurrent runs against the same project don't share Redis state.
  const buildId = await readTopLevelKey(statsFile, 'buildId');
  return { files, modules, packageMapping, buildId };
}

function unionDiffsForCommits(commits) {
  const union = new Set();
  for (const c of commits) {
    for (const f of gitDiffNames(c)) union.add(f);
  }
  return [...union];
}

async function pollGraphStatus(percy, buildId, log) {
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const res = await percy.client.getSmartsnapGraphStatus(buildId);
    const status = res?.status;
    log.debug(`SmartSnap: graph status (attempt ${i + 1}) = ${status}`);
    if (status === 'done' || status === 'failed') return status;
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
    log.warn('SmartSnap requires the Storybook build directory (e.g. `percy storybook ./storybook-static`); URL and `start` modes are not supported. Running full snapshot set');
    return snapshots;
  }

  // Treat statsFile as a flat filename anchored inside the build directory.
  // path.basename() strips any traversal segments so the resolved path can't
  // escape buildDir even if the config is hostile.
  const statsName = path.basename(statsFile || 'enriched-stats.json');
  if (!/^[\w.-]+\.json$/i.test(statsName)) {
    log.warn(`SmartSnap: invalid statsFile "${statsName}" — must be a .json filename; running full snapshot set`);
    return snapshots;
  }
  const resolvedStatsPath = path.join(path.resolve(buildDir), statsName);
  let statsStat;
  try {
    statsStat = fs.statSync(resolvedStatsPath);
  } catch {
    log.warn(`SmartSnap: stats file "${statsName}" not found in build directory ${buildDir}; running full snapshot set`);
    return snapshots;
  }
  if (!statsStat.isFile()) {
    log.warn(`SmartSnap: stats file "${statsName}" in ${buildDir} is not a regular file; running full snapshot set`);
    return snapshots;
  }

  const snapshotNames = snapshots.map(s => s.name);
  const nameToCommit = await percy.client.getSmartsnapSnapshotNameToCommit(snapshotNames);
  log.debug(`SmartSnap: nameToCommit ${JSON.stringify(nameToCommit)}`);

  let affectedNodes;

  if (baseline) {
    log.debug(`SmartSnap: diffing against baseline "${baseline}"`);
    affectedNodes = gitDiffNames(baseline);
  } else {
    const commits = new Set();
    for (const entry of Object.values(nameToCommit || {})) {
      if (entry?.commit_sha != null) commits.add(entry.commit_sha);
    }
    log.debug(`SmartSnap: union diff across ${commits.size} baseline commits`);
    affectedNodes = unionDiffsForCommits(commits);
  }

  if (untraced?.length) {
    affectedNodes = affectedNodes.filter(p => !untraced.some(g => matchesPattern(p, g)));
  }

  if (bailOnChanges?.length) {
    const bailed = affectedNodes.find(p => bailOnChanges.some(g => matchesPattern(p, g)));
    if (bailed) {
      log.warn(`SmartSnap: change to "${bailed}" matched bailOnChanges; running full snapshot set`);
      return snapshots;
    }
  }

  const projectRoot = gitProjectRoot();
  log.debug(`SmartSnap: parsing stats file ${resolvedStatsPath}`);
  const { files, modules, packageMapping, buildId } = await readStats(resolvedStatsPath, projectRoot);

  if (typeof buildId !== 'string' || !buildId) {
    log.warn(`SmartSnap: stats file at ${resolvedStatsPath} is missing a top-level "buildId" — running full snapshot set`);
    return snapshots;
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

  log.debug(`SmartSnap: starting graph generation job ${JSON.stringify({ buildId, files, modules, packageMapping, storybookPaths, affectedNodes })}`);
  await percy.client.generateSmartsnapGraph(buildId, {
    files, modules, packageMapping, storybookPaths, affectedNodes
  });

  const status = await pollGraphStatus(percy, buildId, log);
  if (status !== 'done') {
    log.warn(`SmartSnap: graph generation did not complete (status: ${status ?? 'timed out'}); running full snapshot set`);
    return snapshots;
  }

  const data = await percy.client.getSmartsnapGraphData(buildId, { trace: true });

  // Persist the rendered Drawflow visualization next to where the user ran
  // percy, so they can open it after the build finishes.

  log.info(`SmartSnap: graph data trace ${JSON.stringify(data)}`);

  if (trace && data?.trace_graph_html) {
    const tracePath = path.resolve(process.cwd(), 'trace.html');
    try {
      fs.writeFileSync(tracePath, data.trace_graph_html);
      log.info(`SmartSnap: trace written to ${tracePath}`);
    } catch (e) {
      log.warn(`SmartSnap: failed to write trace.html: ${e.message}`);
    }
  }

  const affected = new Set((data?.affected_stories || []).map(s => s.file_path));

  // Use the same normalization on lookup so a snapshot's `./src/...` matches
  // an affected-stories `src/...` from the API.
  const filtered = snapshots.filter(s => {
    const p = normalizeImportPath(s.importPath);
    return p && affected.has(p);
  });
  log.info(`SmartSnap: ${filtered.length} of ${snapshots.length} snapshots affected by changes`);
  return filtered;
}
