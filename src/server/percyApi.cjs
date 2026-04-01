'use strict';

const { PERCY_EVENTS } = require('../constants.cjs');
const { loggedFetch } = require('./apiLogger.cjs');
const { PERCY_API_BASE, basicAuth } = require('./utils.cjs');

const PAGE_LIMIT = 30;

/* ─── Channel handlers ────────────────────────────────────────────────── */

function registerPercyApiHandlers(channel) {
  /**
   * VALIDATE_CREDENTIALS
   * Validates BrowserStack username + access key against Percy API.
   * Payload: { username, accessKey }
   * Response: { valid: true } or { valid: false, error: string }
   */
  channel.on(PERCY_EVENTS.VALIDATE_CREDENTIALS, async ({ username, accessKey }) => {
    try {
      const res = await loggedFetch(
        `${PERCY_API_BASE}/user`,
        {
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`,
            'Content-Type': 'application/json'
          }
        },
        'validate-credentials'
      );

      if (res.ok) {
        channel.emit(PERCY_EVENTS.CREDENTIALS_VALIDATED, { valid: true });
      } else {
        channel.emit(PERCY_EVENTS.CREDENTIALS_VALIDATED, {
          valid: false,
          error: 'Username/Access Key is incorrect'
        });
      }
    } catch (err) {
      channel.emit(PERCY_EVENTS.CREDENTIALS_VALIDATED, {
        valid: false,
        error: 'Network error. Please check your connection.'
      });
    }
  });

  /**
   * FETCH_PROJECTS
   * Fetches Percy projects with search and pagination.
   * Payload: { username, accessKey, search, page }
   * Response: { projects: [...], hasMore: bool } or { error: string }
   */
  channel.on(PERCY_EVENTS.FETCH_PROJECTS, async ({ username, accessKey, search, page = 0 }) => {
    try {
      const params = new URLSearchParams({
        'filter[product]': 'web',
        origin: 'percy_web',
        'page[limit]': String(PAGE_LIMIT),
        'page[offset]': String(page * PAGE_LIMIT)
      });
      if (search) params.set('filter[search]', search);

      const res = await loggedFetch(
        `${PERCY_API_BASE}/projects?${params}`,
        {
          headers: { Authorization: `Basic ${basicAuth(username, accessKey)}`, 'X-Percy-New-Dashboard': 'true' }
        },
        'fetch-projects'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.PROJECTS_FETCHED, {
          error: 'Failed to load projects',
          search,
          page
        });
        return;
      }

      const json = await res.json();
      const projects = (json.data || []).map(p => ({
        id: p.id,
        name: p.attributes?.name || p.attributes?.slug || `Project ${p.id}`,
        updatedAt: p.attributes?.['updated-at'] || ''
      }));

      channel.emit(PERCY_EVENTS.PROJECTS_FETCHED, {
        projects,
        hasMore: projects.length >= PAGE_LIMIT,
        search,
        page
      });
    } catch (err) {
      channel.emit(PERCY_EVENTS.PROJECTS_FETCHED, {
        error: err.name === 'AbortError' ? null : 'Failed to load projects',
        search,
        page
      });
    }
  });

  /**
   * CREATE_PROJECT
   * Creates a new Percy project.
   * Payload: { username, accessKey, projectName }
   * Response: { project: { id, name } } or { error: string }
   */
  channel.on(PERCY_EVENTS.CREATE_PROJECT, async ({ username, accessKey, projectName }) => {
    try {
      const res = await loggedFetch(
        `${PERCY_API_BASE}/projects`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: { attributes: { name: projectName, type: 'web' } }
          })
        },
        'create-project'
      );

      if (!res.ok) {
        const httpError = getHttpError(res.status);
        if (httpError) {
          channel.emit(PERCY_EVENTS.PROJECT_CREATED, { error: httpError });
          return;
        }
        const json = await res.json().catch(() => null);
        channel.emit(PERCY_EVENTS.PROJECT_CREATED, { error: parseApiError(json) });
        return;
      }

      const json = await res.json();
      const project = {
        id: json.data.id,
        name: json.data.attributes.name
      };
      channel.emit(PERCY_EVENTS.PROJECT_CREATED, { project });
    } catch (err) {
      channel.emit(PERCY_EVENTS.PROJECT_CREATED, {
        error: 'Network error. Please check your connection.'
      });
    }
  });
}

/* ─── Error helpers ───────────────────────────────────────────────────── */

function parseApiError(json) {
  if (json?.errors?.length) {
    const detailed = json.errors.find(e => e.detail);
    if (detailed?.detail) return detailed.detail;
  }
  return 'Failed to create project. Please try again.';
}

function getHttpError(status) {
  if (status === 401) return 'Authentication failed. Please update your credentials.';
  if (status === 403) return 'You don\'t have permission to create projects.';
  if (status === 429) return 'Too many requests. Please try again later.';
  if (status >= 500) return 'Something went wrong. Please try again.';
  return null;
}

module.exports = { registerPercyApiHandlers };
