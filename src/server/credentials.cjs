'use strict';

const fs = require('fs');
const path = require('path');
const { PERCY_EVENTS } = require('../constants.cjs');
const { getEnvPath, setKey, readEnvRaw, writeEnvRaw } = require('./env.cjs');

/* ─── Session cache ─────────────────────────────────────────────────────
 * Holds credentials in server memory when the user declines .env consent.
 * Cleared when the Storybook dev server restarts.
 */
const sessionCreds = { username: '', accessKey: '' };

function setSessionCredentials(username, accessKey) {
  sessionCreds.username = username || '';
  sessionCreds.accessKey = accessKey || '';
}

function getSessionCredentials() {
  return { username: sessionCreds.username, accessKey: sessionCreds.accessKey };
}

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
 * Read BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY.
 * Checks .env first; falls back to session cache (session-only mode where
 * the user declined to persist credentials to .env).
 */
function readBsCredentials() {
  const { parseEnv } = require('./env.cjs');
  const envPath = getEnvPath();
  let username = '';
  let accessKey = '';
  if (fs.existsSync(envPath)) {
    const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
    username = parsed.BROWSERSTACK_USERNAME || '';
    accessKey = parsed.BROWSERSTACK_ACCESS_KEY || '';
  }
  // Fall back to in-memory session cache
  if (!username) username = sessionCreds.username;
  if (!accessKey) accessKey = sessionCreds.accessKey;
  return { username, accessKey, projectName: getProjectName() };
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
      // Also populate session cache so in-flight handlers see the update immediately
      setSessionCredentials(username, accessKey);
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_SAVED, { success: true });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_SAVED, {
        success: false,
        error: 'Failed to save credentials'
      });
    }
  });

  // Session-only mode: user declined to persist to .env, but credentials
  // must still be accessible to server handlers for the current session.
  channel.on(PERCY_EVENTS.SET_SESSION_CREDENTIALS, ({ username, accessKey }) => {
    setSessionCredentials(username, accessKey);
  });
}

module.exports = {
  readBsCredentials,
  writeBsCredentials,
  getSessionCredentials,
  setSessionCredentials,
  registerCredentialHandlers
};
