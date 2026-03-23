'use strict';

const { PERCY_EVENTS } = require('../constants.cjs');
const { loggedFetch } = require('./apiLogger.cjs');
const { readBsCredentials } = require('./credentials.cjs');
const { PERCY_API_BASE, validateBuildId, basicAuth } = require('./utils.cjs');

/* ─── Channel handlers ────────────────────────────────────────────────── */

function registerBuildItemsHandlers(channel) {
  /**
   * FETCH_BUILD_ITEMS
   * Fetches build items from Percy API with filters extracted from build metadata.
   * Also includes the Percy auth token for the review-viewer package.
   *
   * NOTE: The Percy token is sent to the browser so that review-viewer can make
   * direct API calls to percy.io. This is acceptable for a localhost dev tool.
   * The token is project-scoped (not account-wide).
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

      channel.emit(PERCY_EVENTS.BUILD_ITEMS_FETCHED, {
        buildId: id,
        items: json.data || [],
        filters: json.meta?.filters || null,
        authToken: basicAuth(username, accessKey)
      });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BUILD_ITEMS_FETCHED, {
        error: err.message, buildId: String(buildId)
      });
    }
  });
}

module.exports = { registerBuildItemsHandlers };
