/**
 * Per-build Storybook hosting upload (PER-8973). After a directory-mode `percy storybook`
 * run, zips the built storybook-static directory and uploads it to percy-api for hosting.
 *
 * Talks to percy-api directly via axios (percy.client.post is JSON-only), reusing
 * percy.client.token + apiUrl so env overrides track the rest of the SDK.
 *
 * Guarantees:
 *   - Best-effort: every failure is logged and swallowed. Never throws, never exits non-zero.
 *   - Opt-in only (the caller checks storybook.uploadBundle before invoking).
 *   - 200 MB zip cap: over the cap, we skip the upload and send a failure beacon so the
 *     review page shows an actionable "unavailable" state instead of silently nothing.
 *   - Retries transient failures (network / 5xx / 429) with capped exponential backoff
 *     (total horizon ~65s — this runs inside the customer's CI, so it must not hang it).
 *   - On terminal failure, sends a best-effort failure beacon (state_hint=failed).
 */

import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import FormData from 'form-data';
import axios from 'axios';

export const MAX_BUNDLE_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [5000, 15000, 45000]; // capped horizon ~65s

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry only on transient failures; a 4xx (e.g. 403 feature_disabled, 401, 404) is terminal.
function isRetryable(err) {
  const status = err.response?.status;
  if (status == null) return true; // network / timeout — no response
  return status === 429 || status >= 500;
}

/** Streams a directory into a single in-memory zip Buffer via archiver. */
async function zipDirectory(directory) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    const sink = new PassThrough();

    archive.on('error', reject);
    sink.on('error', reject);
    sink.on('data', chunk => chunks.push(chunk));
    sink.on('end', () => resolve(Buffer.concat(chunks)));

    archive.pipe(sink);
    archive.directory(directory, false);
    archive.finalize();
  });
}

function endpoint(apiUrl, buildId) {
  return `${apiUrl}/builds/${buildId}/storybook_bundle`;
}

function authHeaders(token, extra = {}) {
  return { ...extra, Authorization: `Token token=${token}` };
}

/**
 * Best-effort failure beacon: creates a `failed` bundle row (no file) so the failure is
 * visible on the review page and counted in the hosting-success metric.
 */
async function sendFailureBeacon({ apiUrl, token, buildId, reason, log }) {
  try {
    const form = new FormData();
    form.append('state_hint', 'failed');
    form.append('reason', reason);
    await axios.post(endpoint(apiUrl, buildId), form, {
      headers: authHeaders(token, form.getHeaders())
    });
  } catch {
    // The beacon itself is best-effort; nothing more to do.
    log?.debug?.('Storybook bundle failure beacon could not be delivered');
  }
}

/**
 * @param {Object} args
 * @param {Object} args.percy     percy core instance (has .client with apiUrl + token)
 * @param {Object} args.log       logger (info/warn/debug)
 * @param {string} args.directory absolute path to the static Storybook build dir
 * @param {string|number} args.buildId the Percy build id
 * @param {number} [args.maxBytes] zip size cap (defaults to MAX_BUNDLE_BYTES; overridable for tests)
 */
export async function uploadStorybookBundle({ percy, log, directory, buildId, maxBytes = MAX_BUNDLE_BYTES }) {
  const apiUrl = percy?.client?.apiUrl;
  const token = percy?.client?.token;

  if (!apiUrl || !token || !buildId || !directory) {
    log?.warn?.(
      'Storybook bundle upload skipped: missing ' +
      `apiUrl=${!!apiUrl} token=${!!token} buildId=${!!buildId} directory=${!!directory}`
    );
    return;
  }

  let zipBuffer;
  try {
    zipBuffer = await zipDirectory(directory);
  } catch (err) {
    log?.warn?.(`Storybook bundle upload skipped: could not zip directory: ${err.message}`);
    await sendFailureBeacon({ apiUrl, token, buildId, reason: 'client_failed', log });
    return;
  }

  if (zipBuffer.length > maxBytes) {
    log?.warn?.(
      `Storybook bundle (${Math.round(zipBuffer.length / 1024 / 1024)} MB) exceeds the ` +
      `${Math.round(maxBytes / 1024 / 1024)} MB hosting limit and was not uploaded. Trim ` +
      'addons or large static assets, or contact support to raise the limit.'
    );
    await sendFailureBeacon({ apiUrl, token, buildId, reason: 'size_cap', log });
    return;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const form = new FormData();
    form.append('bundle', zipBuffer, { filename: 'bundle.zip', contentType: 'application/zip' });
    try {
      await axios.post(endpoint(apiUrl, buildId), form, {
        headers: authHeaders(token, form.getHeaders()),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      log?.info?.(`Uploaded Storybook bundle for build #${buildId}`);
      return;
    } catch (err) {
      const status = err.response?.status;
      const detail = status ? `HTTP ${status}` : err.message;

      if (!isRetryable(err)) {
        // Terminal (e.g. 403 feature_disabled): not a client upload failure worth a beacon.
        log?.warn?.(`Storybook bundle upload skipped: ${detail}`);
        return;
      }
      if (attempt < MAX_ATTEMPTS) {
        log?.debug?.(`Storybook bundle upload attempt ${attempt} failed (${detail}); retrying`);
        await sleep(BACKOFF_MS[attempt - 1]);
        continue;
      }
      log?.warn?.(`Storybook bundle upload failed after ${MAX_ATTEMPTS} attempts: ${detail}`);
      await sendFailureBeacon({ apiUrl, token, buildId, reason: 'client_failed', log });
    }
  }
}

export default uploadStorybookBundle;
