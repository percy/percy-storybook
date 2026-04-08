'use strict';

const fs = require('fs');
const { PERCY_EVENTS } = require('../constants.cjs');
const { getPercyYmlPath, readEnv, readEnvRaw, setKey, writeEnvRaw } = require('./env.cjs');
const { readBsCredentials } = require('./credentials.cjs');
const { loggedFetch } = require('./apiLogger.cjs');
const { PERCY_API_BASE, validateBuildId, basicAuth } = require('./utils.cjs');

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
 * Write project info to .percy.yml, preserving existing content.
 * Appends or updates the project section without clearing other config.
 */
function writePercyYml(projectId, projectName) {
  const ymlPath = getPercyYmlPath();
  let content = '';

  if (fs.existsSync(ymlPath)) {
    content = fs.readFileSync(ymlPath, 'utf8');
  }

  const projectBlock = `project:\n  id: ${projectId}\n  name: "${projectName}"`;

  // Check if a project section already exists
  const projectSectionRegex = /^project:\s*\n(?:\s+\w[^\n]*\n?)*/m;
  if (projectSectionRegex.test(content)) {
    // Replace existing project section
    content = content.replace(projectSectionRegex, projectBlock + '\n');
  } else {
    // Append project section
    if (content && !content.endsWith('\n')) content += '\n';
    if (content) content += '\n';
    content += projectBlock + '\n';
  }

  fs.writeFileSync(ymlPath, content, 'utf8');
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

/* ─── Build restore helper ─────────────────────────────────────────────── */

/**
 * Fetch last build status from Percy API for restore-on-startup.
 * Returns build summary or null on any failure (graceful degradation).
 */
async function fetchLastBuild(buildIdRaw, username, accessKey) {
  const id = validateBuildId(buildIdRaw);
  const res = await loggedFetch(
    `${PERCY_API_BASE}/builds/${id}?include-metadata=true&include=base-build`,
    {
      headers: {
        Authorization: `Basic ${basicAuth(username, accessKey)}`,
        'Content-Type': 'application/json'
      }
    },
    'restore-last-build'
  );
  if (!res.ok) return null;
  const json = await res.json();
  const attrs = json.data.attributes;

  // Extract branch names and timestamps
  const headBranch = attrs.branch || '';
  const finishedAt = attrs['finished-at'] || null;
  let baseBranch = '';
  let baseBuildFinishedAt = null;
  const baseBuildRel = json.data.relationships?.['base-build']?.data;
  if (baseBuildRel?.id && Array.isArray(json.included)) {
    const baseBuild = json.included.find(
      inc => inc.type === 'builds' && inc.id === baseBuildRel.id
    );
    baseBranch = baseBuild?.attributes?.branch || '';
    baseBuildFinishedAt = baseBuild?.attributes?.['finished-at'] || null;
  }

  return {
    buildId: id,
    state: attrs.state,
    buildNumber: attrs['build-number'],
    webUrl: attrs['web-url'],
    headBranch,
    baseBranch,
    finishedAt,
    baseBuildFinishedAt,
    meta: json.meta || null
  };
}

/* ─── Channel handlers ─────────────────────────────────────────────────── */

function registerProjectConfigHandlers(channel) {
  // Load project config on startup — validates credentials via Percy API
  // Also restores last build state if PERCY_LAST_TRIGGER_BUILD exists
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

      // Read env + project config (sync, fast)
      const envVars = readEnv();
      const project = readPercyYml();
      const hasValidToken = !!envVars.PERCY_TOKEN;
      const lastBuildId = envVars.PERCY_LAST_TRIGGER_BUILD;

      // Parallelize: validate credentials AND fetch last build status
      const [credResult, buildResult] = await Promise.allSettled([
        loggedFetch(
          'https://percy.io/api/v1/user',
          {
            headers: {
              Authorization: `Basic ${basicAuth(username, accessKey)}`,
              'Content-Type': 'application/json'
            }
          },
          'startup-validate-credentials'
        ),
        (lastBuildId && /^\d{1,20}$/.test(lastBuildId))
          ? fetchLastBuild(lastBuildId, username, accessKey)
          : Promise.resolve(null)
      ]);

      const credentialsValid = credResult.status === 'fulfilled' && credResult.value?.ok;
      const lastBuild = buildResult.status === 'fulfilled' ? buildResult.value : null;

      if (buildResult.status === 'rejected') {
        console.warn('Failed to restore last build:', buildResult.reason?.message);
      }

      if (!credentialsValid) {
        channel.emit(PERCY_EVENTS.PROJECT_CONFIG_LOADED, {
          credentialsValid: false,
          project: null,
          hasValidToken: false
        });
        return;
      }

      // Auto-fetch token when project exists in .percy.yml but PERCY_TOKEN is missing
      let tokenValid = hasValidToken;
      if (project && !hasValidToken) {
        try {
          const percyToken = await fetchPercyToken(project.id, username, accessKey);
          setPercyToken(percyToken);
          tokenValid = true;
        } catch (err) {
          console.warn('Auto-fetch Percy token failed:', err.message);
        }
      }

      channel.emit(PERCY_EVENTS.PROJECT_CONFIG_LOADED, {
        credentialsValid: true,
        username,
        accessKey,
        project,
        hasValidToken: tokenValid,
        lastBuild
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
    // Clear stale build reference — new project means old build is irrelevant
    try {
      let envContent = readEnvRaw();
      envContent = setKey(envContent, 'PERCY_LAST_TRIGGER_BUILD', '');
      writeEnvRaw(envContent);
    } catch (err) {
      console.warn('Failed to clear last build reference:', err.message);
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
