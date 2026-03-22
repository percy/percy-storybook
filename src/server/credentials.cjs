'use strict';

const fs = require('fs');
const path = require('path');
const { PERCY_EVENTS } = require('../constants.cjs');
const { getEnvPath, setKey, readEnvRaw, writeEnvRaw } = require('./env.cjs');

/* ─── Helpers ──────────────────────────────────────────────────────────── */

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
 * Read BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY from .env (if it exists).
 */
function readBsCredentials() {
  const { parseEnv } = require('./env.cjs');
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
 * Write / update BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY in .env.
 * Preserves all other existing entries.
 */
function writeBsCredentials(username, accessKey) {
  let content = readEnvRaw();
  content = setKey(content, 'BROWSERSTACK_USERNAME', username);
  content = setKey(content, 'BROWSERSTACK_ACCESS_KEY', accessKey);
  writeEnvRaw(content);
}

/* ─── Channel handlers ─────────────────────────────────────────────────── */

function registerCredentialHandlers(channel) {
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
}

module.exports = { readBsCredentials, writeBsCredentials, registerCredentialHandlers };
