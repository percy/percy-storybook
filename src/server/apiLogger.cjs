'use strict';

const fs = require('fs');
const path = require('path');

/* ─── Log file path ───────────────────────────────────────────────────── */

function getApiLogPath() {
  const logDir = path.join(process.cwd(), 'log');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, 'percy-api.log');
}

/* ─── Logger ──────────────────────────────────────────────────────────── */

/**
 * Log an API call with method, URL, status, duration, and optional context.
 *
 * @param {Object} opts
 * @param {string} opts.method   - HTTP method (GET, POST, etc.)
 * @param {string} opts.url      - Request URL
 * @param {number} opts.status   - HTTP status code (0 if network error)
 * @param {boolean} opts.success - Whether the request succeeded
 * @param {number} opts.duration - Duration in milliseconds
 * @param {string} [opts.context] - Caller context (e.g. "validate-credentials")
 * @param {string} [opts.error]  - Error message if failed
 */
function logApiCall({ method, url, status, success, duration, context, error }) {
  const timestamp = new Date().toISOString();
  const statusLabel = success ? 'SUCCESS' : 'FAIL';
  const parts = [
    `[${timestamp}]`,
    `[${statusLabel}]`,
    `${method} ${url}`,
    `→ ${status}`,
    `(${duration}ms)`
  ];
  if (context) parts.push(`[${context}]`);
  if (error) parts.push(`Error: ${error}`);

  const line = parts.join(' ') + '\n';
  try {
    fs.appendFileSync(getApiLogPath(), line, 'utf8');
  } catch { /* ignore write errors */ }
}

/**
 * Wrapper around fetch that automatically logs the request and response.
 *
 * @param {string} url      - Request URL
 * @param {Object} options  - Fetch options (method, headers, body, signal, etc.)
 * @param {string} context  - Caller context for the log (e.g. "fetch-projects")
 * @returns {Promise<Response>} - The fetch response
 */
async function loggedFetch(url, options = {}, context = '') {
  const method = (options.method || 'GET').toUpperCase();
  const start = Date.now();
  let response;

  try {
    response = await fetch(url, options);
    const duration = Date.now() - start;

    logApiCall({
      method,
      url: sanitizeUrl(url),
      status: response.status,
      success: response.ok,
      duration,
      context,
      error: response.ok ? undefined : `HTTP ${response.status} ${response.statusText}`
    });

    return response;
  } catch (err) {
    const duration = Date.now() - start;

    // Don't log aborted requests as errors
    if (err.name === 'AbortError') {
      logApiCall({
        method,
        url: sanitizeUrl(url),
        status: 0,
        success: false,
        duration,
        context,
        error: 'Request aborted'
      });
    } else {
      logApiCall({
        method,
        url: sanitizeUrl(url),
        status: 0,
        success: false,
        duration,
        context,
        error: err.message
      });
    }

    throw err;
  }
}

/**
 * Strip query-string auth tokens from URL for safe logging.
 * Only strips known sensitive params; preserves pagination/filter params.
 */
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    for (const key of ['token', 'access_key', 'secret']) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, '***');
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

module.exports = { logApiCall, loggedFetch, getApiLogPath };
