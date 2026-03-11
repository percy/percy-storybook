'use strict';

const fs = require('fs');
const path = require('path');
const { PERCY_EVENTS } = require('./src/constants.cjs');

/**
 * Percy Storybook Addon – Preset (CommonJS)
 */

function managerEntries(entry = []) {
  return [...entry, require.resolve('./manager.js')];
}

/* ─── .env helpers ──────────────────────────────────────────────────────── */

function getEnvPath() {
  return path.join(process.cwd(), '.env');
}

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
 * Read BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY from .env (if it exists).
 */
function readBsCredentials() {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return { username: '', accessKey: '' };
  const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
  return {
    username: parsed.BROWSERSTACK_USERNAME || '',
    accessKey: parsed.BROWSERSTACK_ACCESS_KEY || ''
  };
}

/**
 * Write / update BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY in .env.
 * Preserves all other existing entries.
 */
function writeBsCredentials(username, accessKey) {
  const envPath = getEnvPath();
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  function setKey(src, key, value) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}=${value}`;
    return re.test(src) ? src.replace(re, line) : (src.trim() ? `${src.trim()}\n${line}\n` : `${line}\n`);
  }

  content = setKey(content, 'BROWSERSTACK_USERNAME', username);
  content = setKey(content, 'BROWSERSTACK_ACCESS_KEY', accessKey);
  fs.writeFileSync(envPath, content, 'utf8');
}

/* ─── Server channel ────────────────────────────────────────────────────── */

const experimental_serverChannel = async function serverChannel(channel) {
  // When the panel mounts, send it the current .env values
  channel.on(PERCY_EVENTS.LOAD_BS_CREDENTIALS, () => {
    const creds = readBsCredentials();
    channel.emit(PERCY_EVENTS.BS_CREDENTIALS_LOADED, creds);
  });

  // When the user clicks Authenticate, persist to .env
  channel.on(PERCY_EVENTS.SAVE_BS_CREDENTIALS, ({ username, accessKey }) => {
    try {
      writeBsCredentials(username, accessKey);
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_SAVED, { success: true });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_SAVED, {
        success: false,
        error: err.message
      });
    }
  });

  // MUST return the channel — Storybook presets use a reducer pattern where
  // each preset's hook receives and must return the accumulated channel value.
  // Returning undefined here would set channel = undefined for every subsequent
  // Storybook-internal consumer (e.g. the webpack5 builder), causing crashes.
  return channel;
};

module.exports = { managerEntries, experimental_serverChannel };
