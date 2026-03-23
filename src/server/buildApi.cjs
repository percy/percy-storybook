'use strict';

const { PERCY_EVENTS } = require('../constants.cjs');
const { loggedFetch } = require('./apiLogger.cjs');
const { readBsCredentials } = require('./credentials.cjs');
const { PERCY_API_BASE, validateBuildId, basicAuth } = require('./utils.cjs');

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

/* ─── Channel handlers ────────────────────────────────────────────────── */

function registerBuildApiHandlers(channel) {

  /**
   * FETCH_BUILD_STATUS
   * Polls Percy Build API for current build state.
   * Payload: { buildId }
   * Response: { buildId, buildNumber, state, ... } or { error, buildId }
   */
  channel.on(PERCY_EVENTS.FETCH_BUILD_STATUS, async ({ buildId }) => {
    try {
      const id = validateBuildId(buildId);
      const { username, accessKey } = readBsCredentials();
      const res = await loggedFetch(
        `${PERCY_API_BASE}/builds/${id}?include-metadata=true`,
        {
          headers: {
            'Authorization': `Basic ${basicAuth(username, accessKey)}`,
            'Content-Type': 'application/json'
          }
        },
        'fetch-build-status'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.BUILD_STATUS_FETCHED, {
          error: `HTTP ${res.status}`, buildId: id
        });
        return;
      }

      const json = await res.json();
      const attrs = json.data.attributes;

      channel.emit(PERCY_EVENTS.BUILD_STATUS_FETCHED, {
        buildId: id,
        buildNumber: attrs['build-number'],
        state: attrs.state,
        webUrl: attrs['web-url'],
        failureReason: attrs['failure-reason'],
        totalSnapshots: attrs['total-snapshots'],
        totalComparisons: attrs['total-comparisons'],
        totalComparisonsFinished: attrs['total-comparisons-finished'],
        createdAt: attrs['created-at'],
        averageDuration: attrs['average-duration'],
        buildCountForAverage: attrs['build-count-for-average'],
        reviewState: attrs['review-state'],
        reviewStateReason: attrs['review-state-reason'],
        meta: json.meta || null
      });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BUILD_STATUS_FETCHED, {
        error: err.message, buildId: String(buildId)
      });
    }
  });

  /**
   * FETCH_BUILD_LOGS
   * Downloads build logs for failed builds.
   * Payload: { buildId }
   * Response: { content, filename } or { error }
   */
  channel.on(PERCY_EVENTS.FETCH_BUILD_LOGS, async ({ buildId }) => {
    try {
      const id = validateBuildId(buildId);
      const { username, accessKey } = readBsCredentials();
      const res = await loggedFetch(
        `${PERCY_API_BASE}/logs?build_id=${id}&service_name=cli`,
        {
          headers: {
            'Authorization': `Basic ${basicAuth(username, accessKey)}`
          }
        },
        'fetch-build-logs'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.BUILD_LOGS_FETCHED, {
          error: `Failed to download logs (HTTP ${res.status})`
        });
        return;
      }

      let content = await res.text();
      if (content.length > MAX_LOG_SIZE) {
        content = '[Log truncated — showing last 5MB]\n' +
          content.slice(content.length - MAX_LOG_SIZE);
      }

      channel.emit(PERCY_EVENTS.BUILD_LOGS_FETCHED, {
        content,
        filename: `percy-build-${id}.log`
      });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BUILD_LOGS_FETCHED, {
        error: err.message
      });
    }
  });
}

module.exports = { registerBuildApiHandlers };
