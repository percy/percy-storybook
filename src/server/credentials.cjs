'use strict';

const fs = require('fs');
const path = require('path');
const { PERCY_EVENTS } = require('../constants.cjs');
const { getEnvPath, setKey, readEnvRaw, writeEnvRaw } = require('./env.cjs');
const { loggedFetch } = require('./apiLogger.cjs');
const { PERCY_API_BASE, basicAuth } = require('./utils.cjs');

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

function clearSessionCredentials() {
  sessionCreds.username = '';
  sessionCreds.accessKey = '';
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

/**
 * Verify a username/access key against the Percy user endpoint.
 * Returns true only on a 2xx response.
 */
async function verifyCredentials(username, accessKey) {
  if (!username || !accessKey) return false;
  try {
    const res = await loggedFetch(
      `${PERCY_API_BASE}/user`,
      {
        headers: {
          Authorization: `Basic ${basicAuth(username, accessKey)}`,
          'Content-Type': 'application/json'
        }
      },
      'verify-credentials'
    );
    return !!res.ok;
  } catch {
    return false;
  }
}

/* ─── Channel handlers ─────────────────────────────────────────────────── */

function registerCredentialHandlers(channel) {
  // When the panel mounts, tell it which username is on file so the form can
  // pre-fill it. The access key is a secret and is NEVER sent back to the
  // browser — the user re-enters it (or the stored value is used server-side).
  channel.on(PERCY_EVENTS.LOAD_BS_CREDENTIALS, () => {
    try {
      const creds = readBsCredentials();
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_LOADED, {
        username: creds.username,
        projectName: creds.projectName
      });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BS_CREDENTIALS_LOADED, {
        username: '', projectName: ''
      });
    }
  });

  // When the user clicks Authenticate, persist to .env — but only after the
  // credentials are proven valid against Percy, so a forged event cannot write
  // arbitrary values into the project's .env.
  channel.on(PERCY_EVENTS.SAVE_BS_CREDENTIALS, async ({ username, accessKey }) => {
    try {
      const valid = await verifyCredentials(username, accessKey);
      if (!valid) {
        channel.emit(PERCY_EVENTS.BS_CREDENTIALS_SAVED, {
          success: false,
          error: 'Credentials could not be verified'
        });
        return;
      }
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
  // Only cache them after they verify against Percy, so an unauthenticated or
  // forged event cannot seed (or clobber a working) session with credentials
  // that later privileged handlers would use for API calls.
  channel.on(PERCY_EVENTS.SET_SESSION_CREDENTIALS, async ({ username, accessKey }) => {
    if (await verifyCredentials(username, accessKey)) {
      setSessionCredentials(username, accessKey);
    }
  });
}

module.exports = {
  readBsCredentials,
  writeBsCredentials,
  getSessionCredentials,
  setSessionCredentials,
  clearSessionCredentials,
  registerCredentialHandlers
};
