'use strict';

const { PERCY_EVENTS } = require('../constants.cjs');
const { loggedFetch } = require('./apiLogger.cjs');
const { readBsCredentials } = require('./credentials.cjs');
const { PERCY_API_BASE, basicAuth } = require('./utils.cjs');

/* ─── Lightweight JSON:API denormalizer (no external deps) ────────────── */

function camelCase(str) {
  return str.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
}

function camelCaseKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelCaseKeys);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelCase(k)] = typeof v === 'object' && v !== null ? camelCaseKeys(v) : v;
  }
  return out;
}

function denormalizeJsonApi(response) {
  if (!response || typeof response !== 'object') {
    return { data: null, entities: {}, meta: {} };
  }

  const entities = {};
  if (Array.isArray(response.included)) {
    for (const item of response.included) {
      if (!item.type || !item.id) continue;
      if (!entities[item.type]) entities[item.type] = {};
      const entity = { id: item.id, type: item.type, ...camelCaseKeys(item.attributes || {}) };
      if (item.relationships) {
        for (const [key, rel] of Object.entries(item.relationships)) {
          if (!rel.data) continue;
          entity[camelCase(key)] = Array.isArray(rel.data)
            ? rel.data.map(r => r.id)
            : rel.data.id;
        }
      }
      entities[item.type][item.id] = entity;
    }
  }

  function processItem(item) {
    if (!item) return null;
    const obj = { id: item.id, type: item.type, ...camelCaseKeys(item.attributes || {}) };
    if (item.relationships) {
      for (const [key, rel] of Object.entries(item.relationships)) {
        if (!rel.data) continue;
        obj[camelCase(key)] = Array.isArray(rel.data)
          ? rel.data.map(r => r.id)
          : rel.data.id;
      }
    }
    return obj;
  }

  const data = Array.isArray(response.data)
    ? response.data.map(processItem)
    : processItem(response.data);

  return { data, entities, meta: response.meta || {} };
}

/* ─── Include params (matches Percy frontend snapshotsApi) ────────────── */

const SNAPSHOT_INCLUDES = [
  'comparisons.head-screenshot.image',
  'comparisons.base-screenshot.image',
  'comparisons.diff-image',
  'comparisons.head-screenshot.lossy-image',
  'comparisons.base-screenshot.lossy-image',
  'comparisons.browser',
  'comparisons.tag'
].join(',');

/* ─── Channel handler ─────────────────────────────────────────────────── */

function registerSnapshotDetailHandlers(channel) {
  channel.on(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, async ({ snapshotId }) => {
    try {
      const id = String(snapshotId ?? '');
      if (!/^\d{1,20}$/.test(id)) {
        throw new Error('Invalid snapshotId: must be numeric');
      }

      const { username, accessKey } = readBsCredentials();
      const url = `${PERCY_API_BASE}/snapshots/${id}?include=${encodeURIComponent(SNAPSHOT_INCLUDES)}`;

      const res = await loggedFetch(
        url,
        {
          headers: {
            Authorization: `Basic ${basicAuth(username, accessKey)}`,
            'Content-Type': 'application/json'
          }
        },
        'fetch-snapshot-detail'
      );

      if (!res.ok) {
        channel.emit(PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED, {
          error: `HTTP ${res.status}`, snapshotId: id
        });
        return;
      }

      const json = await res.json();
      const denormalized = denormalizeJsonApi(json);

      channel.emit(PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED, {
        snapshotId: id,
        data: denormalized.data,
        entities: denormalized.entities,
        meta: denormalized.meta
      });
    } catch (err) {
      channel.emit(PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED, {
        error: err.message, snapshotId: String(snapshotId)
      });
    }
  });
}

module.exports = { registerSnapshotDetailHandlers };
