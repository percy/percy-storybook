'use strict';

const crypto = require('crypto');
const { PERCY_EVENTS, CHANNEL_AUTH } = require('../constants.cjs');

/* ─── Channel authentication (CSRF gate) ─────────────────────────────────
 * Storybook's experimental_serverChannel registers every handler on one
 * shared WebSocket channel with no authentication. That channel is reachable
 * by any page the developer visits (cross-origin drive-by to the dev-server
 * WebSocket) and by any other JavaScript in the manager frame. Without a gate,
 * a forged event can write BrowserStack credentials, redirect the Percy token,
 * or approve/reject/delete/merge builds (CWE-306).
 *
 * The gate: every STATE-MUTATING event must carry a per-process nonce that the
 * server injects only into the legitimate, same-origin manager document (see
 * preset.cjs `managerHead`). A cross-origin page cannot read that document, so
 * it cannot learn the nonce, so its forged events are dropped. Read-only
 * fetch/load events are intentionally left open — they expose no write.
 */

// State-mutating events that require a valid nonce.
const PRIVILEGED_EVENTS = new Set([
  PERCY_EVENTS.SAVE_BS_CREDENTIALS,
  PERCY_EVENTS.SET_SESSION_CREDENTIALS,
  PERCY_EVENTS.SAVE_PROJECT_CONFIG,
  PERCY_EVENTS.CREATE_PROJECT,
  PERCY_EVENTS.RUN_SNAPSHOT,
  PERCY_EVENTS.APPROVE_BUILD,
  PERCY_EVENTS.REJECT_BUILD,
  PERCY_EVENTS.DELETE_BUILD,
  PERCY_EVENTS.MERGE_BUILD
]);

const NONCE_FIELD = CHANNEL_AUTH.NONCE_FIELD;

// Shared across every load of this module within the same process/realm so the
// value injected into the manager document (managerHead) always matches the
// value the channel gate checks, even if the preset is evaluated more than once.
const NONCE_SLOT = Symbol.for('percy.storybook.addon.channelNonce');

function generateNonce() {
  return crypto.randomBytes(32).toString('hex');
}

function getOrCreateNonce() {
  if (!globalThis[NONCE_SLOT]) {
    globalThis[NONCE_SLOT] = generateNonce();
  }
  return globalThis[NONCE_SLOT];
}

// Constant-time comparison that never throws on non-string / mismatched input.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Return a channel facade whose `.on` gates privileged events behind the nonce.
 * Non-privileged events and `.emit` pass straight through. The nonce field is
 * stripped from the payload before the real handler runs, so downstream code
 * never sees it.
 */
function guardChannel(channel, nonce) {
  return {
    on(event, handler) {
      if (!PRIVILEGED_EVENTS.has(event)) {
        return channel.on(event, handler);
      }
      return channel.on(event, (payload, ...rest) => {
        const supplied = (payload == null) ? undefined : payload[NONCE_FIELD];
        if (!safeEqual(supplied, nonce)) {
          console.warn(
            `[percy] Rejected unauthenticated "${event}" request on the Storybook ` +
            'server channel (missing or invalid nonce).'
          );
          // Signal the UI so a privileged action started with a missing/stale
          // nonce (e.g. after a dev-server restart) surfaces an error and clears
          // its loading state instead of spinning forever.
          channel.emit(PERCY_EVENTS.UNAUTHORIZED, { event });
          return undefined;
        }
        const clean = { ...payload };
        delete clean[NONCE_FIELD];
        return handler(clean, ...rest);
      });
    },
    emit(...args) {
      return channel.emit(...args);
    }
  };
}

module.exports = {
  PRIVILEGED_EVENTS,
  NONCE_FIELD,
  generateNonce,
  getOrCreateNonce,
  safeEqual,
  guardChannel
};
