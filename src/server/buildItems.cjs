'use strict';

const { PERCY_EVENTS } = require('../constants.cjs');
const { loggedFetch } = require('./apiLogger.cjs');
const { readBsCredentials } = require('./credentials.cjs');
const { readEnv } = require('./env.cjs');
const { PERCY_API_BASE, validateBuildId, basicAuth } = require('./utils.cjs');

/* ─── Channel handlers ────────────────────────────────────────────────── */

function registerBuildItemsHandlers(channel) {
  /**
   * FETCH_BUILD_ITEMS
   * Fetches build items from Percy API with filters extracted from build metadata.
   *
   * The build-items request itself is made server-side using the BrowserStack
   * credentials, which never leave the Node process. For the review-viewer
   * package (which makes its own direct calls to percy.io) we hand the browser
   * only the project-scoped Percy token as a basic-auth value — never the
   * account-level BrowserStack username/access key.
   *
   * Payload: { buildId, meta }
   * Response: { buildId, items, filters, authToken } or { error, buildId }
   */
  channel.on(PERCY_EVENTS.FETCH_BUILD_ITEMS, async ({ buildId, meta }) => {
    try {
      const id = validateBuildId(buildId);
      const { username, accessKey } = readBsCredentials();

      // Validate meta fields server-side (prevent client tampering)
      const browserIds = [
        ...(meta?.browser_ids_with_changes || []),
        ...(meta?.browser_ids_without_changes || [])
      ].filter(bid => /^\d+$/.test(String(bid)));

      const widths = [
        ...(meta?.widths_with_changes || []),
        ...(meta?.widths_without_changes || [])
      ].filter(w => Number.isInteger(Number(w)) && Number(w) > 0);

      // Build query string
      const params = new URLSearchParams();
      params.append('filter[build-id]', id);
      ['changed', 'unchanged'].forEach(c => params.append('filter[category][]', c));
      ['approved', 'unreviewed', 'changes_requested'].forEach(s => params.append('filter[subcategories][]', s));
      browserIds.forEach(b => params.append('filter[browser_ids][]', b));
      widths.forEach(w => params.append('filter[widths][]', w));
      params.append('filter[group_snapshots_by]', 'snapshot');
      params.append('filter[sort_by]', 'diff_ratio');

      const res = await loggedFetch(
        `${PERCY_API_BASE}/build-items?${params}`,
        {
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`,
            'Content-Type': 'application/json'
          }
        },
        'fetch-build-items'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.BUILD_ITEMS_FETCHED, {
          error: `HTTP ${res.status}`, buildId: id
        });
        return;
      }

      const json = await res.json();

      // Only the project-scoped Percy token (written to .env during project
      // setup) may be handed to the browser for review-viewer's direct percy.io
      // calls. It is sent as a basic-auth value (token as username, empty
      // password). Never send the BrowserStack username/access key.
      const percyToken = readEnv().PERCY_TOKEN;

      const payload = {
        buildId: id,
        items: json.data || [],
        filters: json.meta?.filters || null
      };
      if (percyToken) payload.authToken = basicAuth(percyToken, '');

      channel.emit(PERCY_EVENTS.BUILD_ITEMS_FETCHED, payload);
    } catch (err) {
      channel.emit(PERCY_EVENTS.BUILD_ITEMS_FETCHED, {
        error: err.message, buildId: String(buildId)
      });
    }
  });
}

module.exports = { registerBuildItemsHandlers };
