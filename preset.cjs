'use strict';

const fs = require('fs');
const path = require('path');
const { PERCY_EVENTS } = require('./src/constants.cjs');

/**
 * Percy Storybook Addon – Preset (CommonJS)
 */

function managerEntries(entry = []) {
  return [...entry, require.resolve('./dist/manager.js')];
}

/* ─── Path helpers ─────────────────────────────────────────────────────── */

function getEnvPath() {
  return path.join(process.cwd(), '.env');
}

function getPercyYmlPath() {
  return path.join(process.cwd(), '.percy.yml');
}

/* ─── .env helpers ──────────────────────────────────────────────────────── */

/**
 * Parse a .env file into a key→value map (ignores comments / blank lines).
 */
function parseEnv(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return result;
}

/**
 * Set or update a key=value in .env content string.
 * Escapes key for regex safety and rejects newlines in value.
 */
function setKey(src, key, value) {
  if (String(value).includes('\n')) throw new Error(`Invalid value for ${key}: contains newline`);
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escapedKey}=.*$`, 'm');
  const line = `${key}=${value}`;
  return re.test(src) ? src.replace(re, line) : (src.trim() ? `${src.trim()}\n${line}\n` : `${line}\n`);
}

/**
 * Read BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY from .env (if it exists).
 */
function readBsCredentials() {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return { username: '', accessKey: '', projectName: '' };
  const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
  return {
    username: parsed.BROWSERSTACK_USERNAME || '',
    accessKey: parsed.BROWSERSTACK_ACCESS_KEY || '',
    projectName: getProjectName()
  };
}

/**
 * Read the consumer's package.json name to pre-fill project search.
 */
function getProjectName() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgPath)) return '';
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.name || '';
  } catch {
    return '';
  }
}

/**
 * Write / update BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY in .env.
 * Preserves all other existing entries.
 */
function writeBsCredentials(username, accessKey) {
  const envPath = getEnvPath();
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  content = setKey(content, 'BROWSERSTACK_USERNAME', username);
  content = setKey(content, 'BROWSERSTACK_ACCESS_KEY', accessKey);
  fs.writeFileSync(envPath, content, 'utf8');
}

/**
 * Write / overwrite PERCY_TOKEN in .env.
 */
function setPercyToken(token) {
  const envPath = getEnvPath();
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  content = setKey(content, 'PERCY_TOKEN', token);
  fs.writeFileSync(envPath, content, 'utf8');
}

/* ─── .percy.yml helpers ───────────────────────────────────────────────── */

/**
 * Read project info from .percy.yml. Returns { id, name } or null.
 */
function readPercyYml() {
  const ymlPath = getPercyYmlPath();
  if (!fs.existsSync(ymlPath)) return null;
  try {
    const content = fs.readFileSync(ymlPath, 'utf8');
    const idMatch = content.match(/^\s*id:\s*(\d+)\s*$/m);
    const nameMatch = content.match(/^\s*name:\s*"?([^"\n]+)"?\s*$/m);
    if (!idMatch) return null;
    return {
      id: parseInt(idMatch[1], 10),
      name: nameMatch ? nameMatch[1].trim() : ''
    };
  } catch {
    return null;
  }
}

/**
 * Write .percy.yml with project info (overwrites entire file).
 */
function writePercyYml(projectId, projectName) {
  const content = [
    '# Added by Percy Storybook addon',
    'project:',
    `  id: ${projectId}`,
    `  name: "${projectName}"`,
    ''
  ].join('\n');
  fs.writeFileSync(getPercyYmlPath(), content, 'utf8');
}

/* ─── Percy API helpers ────────────────────────────────────────────────── */

/**
 * Fetch the master Percy token for a project.
 */
async function fetchPercyToken(projectId, username, accessKey) {
  const token = Buffer.from(`${username}:${accessKey}`).toString('base64');
  const res = await fetch(`https://percy.io/api/v1/projects/${projectId}/tokens`, {
    headers: { Authorization: `Basic ${token}` }
  });
  if (!res.ok) throw new Error(`Token fetch failed (${res.status})`);
  const json = await res.json();
  const tokens = json.data || [];
  const master = tokens.find(t => t.attributes && t.attributes.role === 'master');
  const selected = master || tokens[0];
  if (!selected || !selected.attributes || !selected.attributes.token) {
    throw new Error('No token found for project');
  }
  return selected.attributes.token;
}

/* ─── Logging helpers ──────────────────────────────────────────────────── */

function getLogPath() {
  const logDir = path.join(__dirname, 'log');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, 'percy.log');
}

function appendLog(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(getLogPath(), line, 'utf8');
  } catch { /* ignore write errors */ }
}

/* ─── Percy build runner ───────────────────────────────────────────────── */

/**
 * Helper to drive an async generator to completion.
 * takeStorybookSnapshots is an async generator that yields promises/generators.
 */
async function runAsyncGenerator(generator) {
  let result = await generator.next();
  while (!result.done) {
    try {
      if (result.value && typeof result.value[Symbol.asyncIterator] === 'function') {
        // nested async generator — drive it recursively
        const nested = await runAsyncGenerator(result.value);
        result = await generator.next(nested);
      } else if (result.value && typeof result.value.then === 'function') {
        const resolved = await result.value;
        result = await generator.next(resolved);
      } else if (Array.isArray(result.value)) {
        const resolved = await Promise.all(
          result.value.map(item =>
            item && typeof item[Symbol.asyncIterator] === 'function'
              ? runAsyncGenerator(item)
              : item && typeof item.then === 'function'
                ? item
                : Promise.resolve(item)
          )
        );
        result = await generator.next(resolved);
      } else {
        result = await generator.next(result.value);
      }
    } catch (err) {
      result = await generator.throw(err);
    }
  }
  return result.value;
}

/**
 * Run a full Percy snapshot build using the SDK.
 * Reads PERCY_TOKEN from .env, uses takeStorybookSnapshots with all storybook
 * options (include, exclude, additionalSnapshots, widths, etc. from .percy.yml).
 */
async function runPercyBuild(channel, { baseUrl, include = [], exclude = [] }) {
  // Clear previous log
  try { fs.writeFileSync(getLogPath(), '', 'utf8'); } catch { /* ignore */ }
  appendLog('=== Percy build started ===');
  appendLog(`Base URL: ${baseUrl}`);
  appendLog(`Include: ${JSON.stringify(include)}`);
  appendLog(`Exclude: ${JSON.stringify(exclude)}`);

  channel.emit(PERCY_EVENTS.SNAPSHOT_STARTED, {});

  try {
    // Read PERCY_TOKEN from .env
    const envPath = getEnvPath();
    if (!fs.existsSync(envPath)) {
      throw new Error('No .env file found. Please set up your project first.');
    }
    const envVars = parseEnv(fs.readFileSync(envPath, 'utf8'));
    const percyToken = envVars.PERCY_TOKEN;
    if (!percyToken) {
      throw new Error('PERCY_TOKEN not found in .env. Please select a project first.');
    }

    // Set PERCY_TOKEN in process env so Percy SDK can use it
    process.env.PERCY_TOKEN = percyToken;

    appendLog('PERCY_TOKEN loaded from .env');

    // Dynamic import of ESM modules
    const { default: Percy } = await import('@percy/core');
    const { takeStorybookSnapshots } = await import('@percy/storybook');
    const { storybookSchema, configSchema } = await import('./src/config.js');
    const { addSchema } = await import('@percy/config');

    // Register storybook config schemas so Percy can validate story params
    // (normally done by the CLI command wrapper, but we call the SDK directly)
    addSchema([storybookSchema, configSchema]);

    appendLog('Percy SDK modules imported, config schemas registered');

    // Build flags for sharding (if ever needed)
    const flags = {};

    // Create Percy instance — pass include/exclude in the storybook config
    // so that mapStorybookSnapshots filters stories correctly.
    // Percy also reads .percy.yml automatically for additionalSnapshots, widths,
    // args, globals, docs rules, etc. — our include/exclude merges on top.
    const percyOptions = { delayUploads: true };
    if (include.length > 0 || exclude.length > 0) {
      percyOptions.storybook = {};
      if (include.length > 0) percyOptions.storybook.include = include;
      if (exclude.length > 0) percyOptions.storybook.exclude = exclude;
    }
    const percy = new Percy(percyOptions);

    appendLog(`Percy instance created with storybook config: ${JSON.stringify(percyOptions.storybook || {})}`);

    // Run the snapshot generator — this handles the full flow:
    // start percy, launch browser, discover stories, map snapshots
    // (including additionalSnapshots from config), capture DOM, upload
    const generator = takeStorybookSnapshots(percy, () => {}, {
      baseUrl,
      flags
    });

    await runAsyncGenerator(generator);

    // Extract build info
    const buildId = percy.build?.id || '';
    const buildUrl = percy.build?.url || '';
    const buildNumber = percy.build?.number || '';

    appendLog(`Build completed — ID: ${buildId}, Number: ${buildNumber}`);
    appendLog(`Build URL: ${buildUrl}`);
    appendLog('=== Percy build finished successfully ===');

    channel.emit(PERCY_EVENTS.SNAPSHOT_SUCCESS, {
      buildId,
      buildUrl,
      buildNumber
    });
  } catch (error) {
    const message = error.message || String(error);
    appendLog(`ERROR: ${message}`);
    appendLog(`Stack: ${error.stack || 'N/A'}`);
    appendLog('=== Percy build failed ===');

    channel.emit(PERCY_EVENTS.SNAPSHOT_ERROR, { message });
  }
}

/* ─── Server channel ────────────────────────────────────────────────────── */

const experimental_serverChannel = async function serverChannel(channel) {
  // When the panel mounts, send it the current .env values
  channel.on(PERCY_EVENTS.LOAD_BS_CREDENTIALS, () => {
    try {
      const creds = readBsCredentials();
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_LOADED, creds);
    } catch (err) {
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_LOADED, {
        username: '', accessKey: '', projectName: ''
      });
    }
  });

  // When the user clicks Authenticate, persist to .env
  channel.on(PERCY_EVENTS.SAVE_BS_CREDENTIALS, ({ username, accessKey }) => {
    try {
      writeBsCredentials(username, accessKey);
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_SAVED, { success: true });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_SAVED, {
        success: false,
        error: 'Failed to save credentials'
      });
    }
  });

  // Load project config on startup (file-existence check only, no network calls)
  channel.on(PERCY_EVENTS.LOAD_PROJECT_CONFIG, () => {
    try {
      const { username, accessKey } = readBsCredentials();
      const credentialsValid = !!(username && accessKey);
      const project = readPercyYml();
      const envPath = getEnvPath();
      let hasValidToken = false;
      if (fs.existsSync(envPath)) {
        const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
        hasValidToken = !!(parsed.PERCY_TOKEN);
      }
      channel.emit(PERCY_EVENTS.PROJECT_CONFIG_LOADED, {
        credentialsValid,
        project,
        hasValidToken
      });
    } catch {
      channel.emit(PERCY_EVENTS.PROJECT_CONFIG_LOADED, {
        credentialsValid: false,
        project: null,
        hasValidToken: false
      });
    }
  });

  // Save project config: write .percy.yml, fetch token, update .env
  channel.on(PERCY_EVENTS.SAVE_PROJECT_CONFIG, ({ projectId, projectName }) => {
    const { username, accessKey } = readBsCredentials();
    if (!username || !accessKey) {
      channel.emit(PERCY_EVENTS.PROJECT_CONFIG_SAVED, {
        success: false,
        error: 'BrowserStack credentials not found'
      });
      return;
    }
    writePercyYml(projectId, projectName);
    fetchPercyToken(projectId, username, accessKey)
      .then(percyToken => {
        setPercyToken(percyToken);
        channel.emit(PERCY_EVENTS.PROJECT_CONFIG_SAVED, { success: true });
      })
      .catch(() => {
        channel.emit(PERCY_EVENTS.PROJECT_CONFIG_SAVED, {
          success: false,
          error: 'Failed to save project configuration'
        });
      });
  });

  // Run Percy snapshot build triggered from the addon panel
  channel.on(PERCY_EVENTS.RUN_SNAPSHOT, (data) => {
    runPercyBuild(channel, data);
  });

  // MUST return the channel — Storybook presets use a reducer pattern where
  // each preset's hook receives and must return the accumulated channel value.
  return channel;
};

module.exports = { managerEntries, experimental_serverChannel };
