'use strict';

const PERCY_API_BASE = 'https://percy.io/api/v1';

/**
 * Validate buildId is a numeric string to prevent SSRF and .env injection.
 */
function validateBuildId(raw) {
  const id = String(raw ?? '');
  if (!/^\d{1,20}$/.test(id)) {
    throw new Error('Invalid buildId: must be numeric');
  }
  return id;
}

/**
 * Validate projectId is a numeric string.
 *
 * projectId arrives from the browser on SAVE_PROJECT_CONFIG and is interpolated
 * both into a Percy API URL and into .percy.yml, so an unvalidated value allows
 * an outbound request to be redirected off percy.io and arbitrary keys to be
 * injected into the config file.
 */
function validateProjectId(raw) {
  const id = String(raw ?? '');
  if (!/^\d{1,20}$/.test(id)) {
    throw new Error('Invalid projectId: must be numeric');
  }
  return id;
}

function basicAuth(username, accessKey) {
  return Buffer.from(`${username}:${accessKey}`).toString('base64');
}

/**
 * Return `value` only if it is an absolute https: URL, else null.
 *
 * Build/project web URLs come from percy.io API responses and end up in
 * `href` and `window.open` in the manager. A tampered response — or a forged
 * client-side BUILD_STATUS_FETCHED emit, which the nonce gate does not cover —
 * could otherwise deliver `javascript:` into the manager context (F-023,
 * CWE-79). Scheme-pinning is deliberate; the hostname is not pinned so a Percy
 * web domain change does not silently break every link.
 */
function safeWebUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

module.exports = { PERCY_API_BASE, validateBuildId, validateProjectId, basicAuth, safeWebUrl };
