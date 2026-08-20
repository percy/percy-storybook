/**
 * Percy Storybook Addon – manager-side channel nonce helper.
 *
 * The server (preset.cjs) injects a per-process nonce into the manager document
 * as a <meta> tag. Only same-origin manager scripts can read it, so attaching it
 * to state-mutating channel events proves the event came from the real Percy UI
 * rather than a cross-origin drive-by page. See src/server/channelAuth.cjs.
 */

import { CHANNEL_AUTH } from '../constants.js';

let cached = '';

/** Read the injected nonce from the manager document (memoised once found). */
export function getPercyNonce() {
  if (cached) return cached;
  try {
    const el = (typeof document !== 'undefined')
      ? document.querySelector(`meta[name="${CHANNEL_AUTH.META_NAME}"]`)
      : null;
    cached = (el && el.getAttribute('content')) || '';
  } catch {
    cached = '';
  }
  return cached;
}

/** Return a copy of `payload` carrying the nonce, for privileged channel emits. */
export function withNonce(payload = {}) {
  return { ...payload, [CHANNEL_AUTH.NONCE_FIELD]: getPercyNonce() };
}
