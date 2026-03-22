'use strict';

const fs = require('fs');
const { PERCY_EVENTS } = require('../constants.cjs');
const { getEnvPath, getPercyYmlPath, readEnv, readEnvRaw, setKey, writeEnvRaw } = require('./env.cjs');
const { readBsCredentials } = require('./credentials.cjs');
const { loggedFetch } = require('./apiLogger.cjs');

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
  const res = await loggedFetch(
    `https://percy.io/api/v1/projects/${projectId}/tokens`,
    { headers: { Authorization: `Basic ${token}` } },
    'fetch-percy-token'
  );
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

/**
 * Write / overwrite PERCY_TOKEN in .env.
 */
function setPercyToken(token) {
  let content = readEnvRaw();
  content = setKey(content, 'PERCY_TOKEN', token);
  writeEnvRaw(content);
}

/* ─── Channel handlers ─────────────────────────────────────────────────── */

function registerProjectConfigHandlers(channel) {
  // Load project config on startup — validates credentials via Percy API
  channel.on(PERCY_EVENTS.LOAD_PROJECT_CONFIG, async () => {
    try {
      const { username, accessKey } = readBsCredentials();
      const hasCredentials = !!(username && accessKey);

      // No credentials saved — go straight to auth
      if (!hasCredentials) {
        channel.emit(PERCY_EVENTS.PROJECT_CONFIG_LOADED, {
          credentialsValid: false,
          project: null,
          hasValidToken: false
        });
        return;
      }

      // Validate credentials via Percy API
      let credentialsValid = false;
      try {
        const token = Buffer.from(`${username}:${accessKey}`).toString('base64');
        const res = await loggedFetch(
          'https://percy.io/api/v1/user',
          { headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' } },
          'startup-validate-credentials'
        );
        credentialsValid = res.ok;
      } catch {
        credentialsValid = false;
      }

      if (!credentialsValid) {
        channel.emit(PERCY_EVENTS.PROJECT_CONFIG_LOADED, {
          credentialsValid: false,
          project: null,
          hasValidToken: false
        });
        return;
      }

      // Credentials valid — check project + token
      const project = readPercyYml();
      const envVars = readEnv();
      const hasValidToken = !!envVars.PERCY_TOKEN;

      channel.emit(PERCY_EVENTS.PROJECT_CONFIG_LOADED, {
        credentialsValid: true,
        username,
        accessKey,
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
}

module.exports = { readPercyYml, writePercyYml, fetchPercyToken, setPercyToken, registerProjectConfigHandlers };
