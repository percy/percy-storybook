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
        `${PERCY_API_BASE}/builds/${id}?include-metadata=true&include=base-build`,
        {
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`,
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

      // Extract branch names and timestamps: head from build, base from included base-build
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
        headBranch,
        baseBranch,
        finishedAt,
        baseBuildFinishedAt,
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
            Authorization: `Basic ${basicAuth(username, accessKey)}`
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

  /**
   * APPROVE_BUILD
   * Approves a Percy build via the reviews API.
   * Payload: { buildId }
   * Response: { buildId, success } or { error, buildId }
   */
  channel.on(PERCY_EVENTS.APPROVE_BUILD, async ({ buildId }) => {
    try {
      const id = validateBuildId(buildId);
      const { username, accessKey } = readBsCredentials();
      const res = await loggedFetch(
        `${PERCY_API_BASE}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              attributes: {
                action: 'approve',
                'review-start-time': Date.now()
              },
              relationships: {
                build: { data: { type: 'builds', id: String(id) } }
              },
              type: 'reviews'
            }
          })
        },
        'approve-build'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.BUILD_APPROVED, {
          error: `Failed to approve build (HTTP ${res.status})`, buildId: id
        });
        return;
      }

      channel.emit(PERCY_EVENTS.BUILD_APPROVED, { buildId: id, success: true });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BUILD_APPROVED, {
        error: err.message, buildId: String(buildId)
      });
    }
  });

  /**
   * REJECT_BUILD
   * Rejects a Percy build via the reviews API.
   * Payload: { buildId }
   * Response: { buildId, success } or { error, buildId }
   */
  channel.on(PERCY_EVENTS.REJECT_BUILD, async ({ buildId }) => {
    try {
      const id = validateBuildId(buildId);
      const { username, accessKey } = readBsCredentials();
      const res = await loggedFetch(
        `${PERCY_API_BASE}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              attributes: {
                action: 'reject',
                'review-start-time': Date.now()
              },
              relationships: {
                build: { data: { type: 'builds', id: String(id) } }
              },
              type: 'reviews'
            }
          })
        },
        'reject-build'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.BUILD_REJECTED, {
          error: `Failed to reject build (HTTP ${res.status})`, buildId: id
        });
        return;
      }

      channel.emit(PERCY_EVENTS.BUILD_REJECTED, { buildId: id, success: true });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BUILD_REJECTED, {
        error: err.message, buildId: String(buildId)
      });
    }
  });

  /**
   * DELETE_BUILD
   * Deletes a Percy build.
   * Payload: { buildId }
   * Response: { buildId, success } or { error, buildId }
   */
  channel.on(PERCY_EVENTS.DELETE_BUILD, async ({ buildId }) => {
    try {
      const id = validateBuildId(buildId);
      const { username, accessKey } = readBsCredentials();
      const res = await loggedFetch(
        `${PERCY_API_BASE}/builds/${id}/delete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`,
            'Content-Type': 'application/json'
          }
        },
        'delete-build'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.BUILD_DELETED, {
          error: `Failed to delete build (HTTP ${res.status})`, buildId: id
        });
        return;
      }

      channel.emit(PERCY_EVENTS.BUILD_DELETED, { buildId: id, success: true });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BUILD_DELETED, {
        error: err.message, buildId: String(buildId)
      });
    }
  });

  /**
   * DOWNLOAD_BUILD_LOGS
   * Downloads build logs and emits content for client-side save.
   * Payload: { buildId }
   * Response: { content, filename } or { error }
   */
  channel.on(PERCY_EVENTS.DOWNLOAD_BUILD_LOGS, async ({ buildId }) => {
    try {
      const id = validateBuildId(buildId);
      const { username, accessKey } = readBsCredentials();
      const res = await loggedFetch(
        `${PERCY_API_BASE}/logs?build_id=${id}&service_name=cli`,
        {
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`
          }
        },
        'download-build-logs'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.BUILD_LOGS_DOWNLOADED, {
          error: `Failed to download logs (HTTP ${res.status})`
        });
        return;
      }

      let content = await res.text();
      if (content.length > MAX_LOG_SIZE) {
        content = '[Log truncated — showing last 5MB]\n' +
          content.slice(content.length - MAX_LOG_SIZE);
      }

      channel.emit(PERCY_EVENTS.BUILD_LOGS_DOWNLOADED, {
        content,
        filename: `percy-build-${id}.log`
      });
    } catch (err) {
      channel.emit(PERCY_EVENTS.BUILD_LOGS_DOWNLOADED, {
        error: err.message
      });
    }
  });
}

module.exports = { registerBuildApiHandlers };
