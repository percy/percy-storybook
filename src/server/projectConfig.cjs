'use strict';

const fs = require('fs');
const { PERCY_EVENTS } = require('../constants.cjs');
const { getPercyYmlPath, readEnv, readEnvRaw, setKey, writeEnvRaw } = require('./env.cjs');
const { readBsCredentials, resolveBsCredentials } = require('./credentials.cjs');
const { loggedFetch } = require('./apiLogger.cjs');
const { PERCY_API_BASE, validateBuildId, validateProjectId, basicAuth, safeWebUrl } = require('./utils.cjs');

/* ─── .percy.yml helpers ───────────────────────────────────────────────── */

/**
 * Serialize a string as a YAML double-quoted scalar.
 *
 * projectName comes from the Percy API and may legitimately contain quotes,
 * colons or '#'. Interpolating it raw produced invalid YAML for those projects
 * (breaking @percy/config, and with it every later build) and let arbitrary
 * keys be injected into .percy.yml. Double-quoted style with escapes keeps the
 * value on a single line, so no new YAML structure can be introduced.
 */
function yamlQuote(value) {
  const str = String(value ?? '');
  return `"${str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')}"`;
}

/**
 * Decode a YAML scalar as written by `yamlQuote`, while still reading the
 * unescaped values older versions of this file wrote (and hand-edited plain
 * scalars), so an existing .percy.yml keeps working.
 */
function yamlUnquote(raw) {
  const str = String(raw ?? '').trim();
  if (!str.startsWith('"')) {
    // Legacy or hand-written plain scalar; strip a stray wrapping quote pair.
    return str.replace(/^"|"$/g, '').trim();
  }
  let out = '';
  for (let i = 1; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\') {
      const next = str[++i];
      if (next === 'n') out += '\n';
      else if (next === 'r') out += '\r';
      else if (next === 't') out += '\t';
      else if (next !== undefined) out += next;
    } else if (ch === '"') {
      break;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Read project info from .percy.yml. Returns { id, name } or null.
 */
function readPercyYml() {
  const ymlPath = getPercyYmlPath();
  if (!fs.existsSync(ymlPath)) return null;
  try {
    const content = fs.readFileSync(ymlPath, 'utf8');
    const idMatch = content.match(/^\s*id:\s*(\d+)\s*$/m);
    const nameMatch = content.match(/^\s*name:\s*(.*)$/m);
    if (!idMatch) return null;
    return {
      id: parseInt(idMatch[1], 10),
      name: nameMatch ? yamlUnquote(nameMatch[1]) : ''
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
  // Re-validate here as well as at the handler boundary: this is the only place
  // the id reaches the config file, and an unvalidated value could introduce
  // extra YAML keys via `id: 1\n  <injected>`.
  const id = validateProjectId(projectId);
  const ymlPath = getPercyYmlPath();
  let content = '';

  if (fs.existsSync(ymlPath)) {
    content = fs.readFileSync(ymlPath, 'utf8');
  }

  const projectBlock = `project:\n  id: ${id}\n  name: ${yamlQuote(projectName)}`;

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
  // Numeric-guard then encode before interpolation: without this a crafted
  // projectId can redirect this authenticated request off percy.io, leaking
  // the BrowserStack access key in the Authorization header.
  const id = encodeURIComponent(validateProjectId(projectId));
  const token = Buffer.from(`${username}:${accessKey}`).toString('base64');
  const res = await loggedFetch(
    `https://percy.io/api/v1/projects/${id}/tokens`,
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

/* ─── Project details helper ──────────────────────────────────────────── */

/**
 * Fetch project details (workflow, default base branch) from Percy API.
 * Returns { workflow, defaultBaseBranch } or null on failure.
 */
async function fetchProjectDetails(projectId, username, accessKey) {
  const res = await loggedFetch(
    `${PERCY_API_BASE}/projects/${encodeURIComponent(validateProjectId(projectId))}`,
    {
      headers: {
        Authorization: `Basic ${basicAuth(username, accessKey)}`,
        'Content-Type': 'application/json'
      }
    },
    'fetch-project-details'
  );
  if (!res.ok) return null;
  const json = await res.json();
  const projectAttrs = json.data?.attributes;
  if (!projectAttrs) return null;
  return {
    workflow: projectAttrs.workflow || 'default',
    defaultBaseBranch: projectAttrs['default-base-branch'] || ''
  };
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

  // Extract branch names, timestamps, and build type
  const headBranch = attrs.branch || '';
  const finishedAt = attrs['finished-at'] || null;
  const buildType = attrs.type || 'web';
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
    webUrl: safeWebUrl(attrs['web-url']),
    reviewState: attrs['review-state'] || null,
    reviewStateReason: attrs['review-state-reason'] || null,
    headBranch,
    baseBranch,
    finishedAt,
    baseBuildFinishedAt,
    buildType,
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

      // Parallelize: validate credentials, fetch last build, and fetch project details
      const [credResult, buildResult, projectDetailsResult] = await Promise.allSettled([
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
          : Promise.resolve(null),
        project?.id
          ? fetchProjectDetails(project.id, username, accessKey)
          : Promise.resolve(null)
      ]);

      const credentialsValid = credResult.status === 'fulfilled' && credResult.value?.ok;
      const lastBuild = buildResult.status === 'fulfilled' ? buildResult.value : null;
      const projectDetails = projectDetailsResult.status === 'fulfilled' ? projectDetailsResult.value : null;

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

      // Do NOT send the BrowserStack username/access key back to the browser.
      // The credentials stay in the Node process; all authenticated Percy calls
      // are made server-side via readBsCredentials().
      channel.emit(PERCY_EVENTS.PROJECT_CONFIG_LOADED, {
        credentialsValid: true,
        project,
        projectDetails,
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
  channel.on(PERCY_EVENTS.SAVE_PROJECT_CONFIG, ({ projectId, projectName, username: payloadUser, accessKey: payloadKey }) => {
    // Prefer the credentials already stored server-side (.env or the validated
    // session cache) over anything supplied in the payload. Falling back to the
    // payload only when nothing is stored covers the first-time session-only
    // flow, but a request can no longer override known-good credentials. Pairs
    // are selected atomically so a stored username never mixes with a payload key.
    const { username, accessKey } = resolveBsCredentials({ username: payloadUser, accessKey: payloadKey });
    if (!username || !accessKey) {
      channel.emit(PERCY_EVENTS.PROJECT_CONFIG_SAVED, {
        success: false,
        error: 'BrowserStack credentials not found'
      });
      return;
    }

    // Validate the browser-supplied projectId once, at the boundary, before it
    // reaches an outbound URL or the config file. The UI only ever sends a
    // Percy JSON:API id, so this rejects nothing a real client would send.
    let id;
    try {
      id = validateProjectId(projectId);
    } catch {
      channel.emit(PERCY_EVENTS.PROJECT_CONFIG_SAVED, {
        success: false,
        error: 'Invalid project selected'
      });
      return;
    }

    // Validate the credentials/project access by fetching the Percy token FIRST.
    // Only persist .percy.yml, PERCY_TOKEN and clear the build reference AFTER
    // validation succeeds — otherwise an unvalidated (or foreign) payload could
    // redirect future snapshots and overwrite the token before the credentials
    // are proven good (PER-8545 / F-015).
    fetchPercyToken(id, username, accessKey)
      .then(percyToken => {
        // Clear stale build reference — new project means old build is irrelevant
        try {
          let envContent = readEnvRaw();
          envContent = setKey(envContent, 'PERCY_LAST_TRIGGER_BUILD', '');
          writeEnvRaw(envContent);
        } catch (err) {
          console.warn('Failed to clear last build reference:', err.message);
        }

        writePercyYml(id, projectName);
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
