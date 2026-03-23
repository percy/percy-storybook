'use strict';

const fs = require('fs');
const path = require('path');
const { PERCY_EVENTS } = require('../constants.cjs');
const { getEnvPath, parseEnv, readEnvRaw, writeEnvRaw, setKey } = require('./env.cjs');

/* ─── Logging helpers ──────────────────────────────────────────────────── */

function getLogPath() {
  const logDir = path.join(process.cwd(), 'log');
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
    const { storybookSchema, configSchema } = await import('../config.js');
    const { addSchema } = await import('@percy/config');

    // Register storybook config schemas so Percy can validate story params
    addSchema([storybookSchema, configSchema]);

    appendLog('Percy SDK modules imported, config schemas registered');

    // Create Percy instance — always pass storybook config (matching POC approach)
    const percy = new Percy({
      delayUploads: true,
      storybook: { include, exclude }
    });

    appendLog(`Percy instance created with storybook: ${JSON.stringify({ include, exclude })}`);

    // Run the snapshot generator — pass include/exclude in flags for filtering
    const generator = takeStorybookSnapshots(percy, () => {}, {
      baseUrl,
      flags: { include, exclude }
    });

    await runAsyncGenerator(generator);

    // Extract build info
    const buildId = percy.build?.id || '';
    const buildUrl = percy.build?.url || '';
    const buildNumber = percy.build?.number || '';

    appendLog(`Build completed — ID: ${buildId}, Number: ${buildNumber}`);
    appendLog(`Build URL: ${buildUrl}`);
    appendLog('=== Percy build finished successfully ===');

    // Fire-and-forget: save buildId to .env for reference
    try {
      let content = readEnvRaw();
      content = setKey(content, 'PERCY_LAST_TRIGGER_BUILD', String(buildId));
      writeEnvRaw(content);
    } catch { /* ignore write errors */ }

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

/* ─── Channel handlers ─────────────────────────────────────────────────── */

function registerSnapshotHandlers(channel) {
  channel.on(PERCY_EVENTS.RUN_SNAPSHOT, (data) => {
    runPercyBuild(channel, data);
  });
}

module.exports = { runPercyBuild, registerSnapshotHandlers };
