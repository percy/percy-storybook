/**
 * Per-build Storybook hosting upload (PER-8973) — content-addressable, direct-to-GCS.
 *
 * Flow (see the PER-8973 design comments):
 *   1. Walk the built storybook-static dir, SHA-256 every file -> manifest [{path, sha, size}].
 *   2. POST /check -> the API returns the MISSING shas, each with a signed PUT URL + the
 *      exact headers to replay (dedup: already-stored files are skipped).
 *   3. PUT each missing file's bytes DIRECTLY to GCS (bounded parallelism). Bytes never
 *      touch percy-api.
 *   4. POST /commit with the manifest (path -> sha) to finalize the build.
 *
 * Talks to percy-api via axios (percy.client.post is JSON-only), reusing percy.client.token
 * + apiUrl. Best-effort: every failure is logged and swallowed; on terminal failure a
 * beacon marks the bundle failed so it surfaces on the review page. Never throws / exits nonzero.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import axios from 'axios';

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // per-file cap (matches API MAX_FILE_BYTES)
export const MAX_BUNDLE_BYTES = 1024 * 1024 * 1024; // per-build total cap
export const MAX_FILE_COUNT = 5000;
const UPLOAD_CONCURRENCY = 12;

function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// Recursively list files under dir as { relPath (posix), absPath, size }.
function walkFiles(dir) {
  const out = [];
  const walk = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childAbs = path.join(abs, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(childAbs, childRel);
      } else if (entry.isFile()) {
        out.push({ relPath: childRel, absPath: childAbs, size: statSync(childAbs).size });
      }
      // symlinks/other types are skipped — only regular files are hosted
    }
  };
  walk(dir, '');
  return out;
}

// Build the manifest by hashing every file. Returns { entries, totalBytes }.
function buildManifest(dir) {
  const entries = walkFiles(dir).map(f => {
    const bytes = readFileSync(f.absPath);
    return { path: f.relPath, sha256: sha256Hex(bytes), size: f.size, absPath: f.absPath };
  });
  const totalBytes = entries.reduce((n, e) => n + e.size, 0);
  return { entries, totalBytes };
}

function endpoint(apiUrl, buildId, suffix) {
  return `${apiUrl}/builds/${buildId}/storybook_bundle${suffix}`;
}

function authHeaders(token, extra = {}) {
  return { ...extra, Authorization: `Token token=${token}` };
}

async function sendFailureBeacon({ apiUrl, token, buildId, reason, log }) {
  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('state_hint', 'failed');
    form.append('reason', reason);
    await axios.post(endpoint(apiUrl, buildId, ''), form, {
      headers: authHeaders(token, form.getHeaders())
    });
  } catch {
    log?.debug?.('Storybook bundle failure beacon could not be delivered');
  }
}

// Run tasks with bounded concurrency; rejects on the first failure.
async function runBounded(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * @param {Object} args
 * @param {Object} args.percy      percy core instance (.client has apiUrl + token)
 * @param {Object} args.log        logger (info/warn/debug)
 * @param {string} args.directory  absolute path to the static Storybook build dir
 * @param {string|number} args.buildId
 * @param {Object} [args.caps]     override {maxFileBytes, maxBundleBytes, maxFileCount} (tests)
 */
export async function uploadStorybookBundle({ percy, log, directory, buildId, caps = {} }) {
  const maxFileBytes = caps.maxFileBytes ?? MAX_FILE_BYTES;
  const maxBundleBytes = caps.maxBundleBytes ?? MAX_BUNDLE_BYTES;
  const maxFileCount = caps.maxFileCount ?? MAX_FILE_COUNT;
  const apiUrl = percy?.client?.apiUrl;
  const token = percy?.client?.token;
  if (!apiUrl || !token || !buildId || !directory) {
    log?.warn?.(
      'Storybook bundle upload skipped: missing ' +
      `apiUrl=${!!apiUrl} token=${!!token} buildId=${!!buildId} directory=${!!directory}`
    );
    return;
  }

  let entries, totalBytes;
  try {
    ({ entries, totalBytes } = buildManifest(directory));
  } catch (err) {
    log?.warn?.(`Storybook bundle upload skipped: could not read build dir: ${err.message}`);
    await sendFailureBeacon({ apiUrl, token, buildId, reason: 'client_failed', log });
    return;
  }

  // Client-side quota pre-check (the API enforces the same before signing).
  const oversize = entries.find(e => e.size > maxFileBytes);
  if (entries.length > maxFileCount || totalBytes > maxBundleBytes || oversize) {
    log?.warn?.(
      'Storybook bundle exceeds hosting limits ' +
      `(${entries.length} files, ${Math.round(totalBytes / 1024 / 1024)} MB) and was not uploaded. ` +
      'Trim addons or large static assets, or contact support to raise the limit.'
    );
    await sendFailureBeacon({ apiUrl, token, buildId, reason: 'size_cap', log });
    return;
  }

  try {
    // (1) /check — one call: which shas are missing + their signed PUT URLs.
    const checkRes = await axios.post(
      endpoint(apiUrl, buildId, '/check'),
      { files: entries.map(e => ({ path: e.path, sha256: e.sha256, size: e.size })) },
      { headers: authHeaders(token) }
    );
    const missing = checkRes.data?.missing || [];
    const bySha = new Map(entries.map(e => [e.sha256, e]));

    // (2)+(3) PUT each missing blob directly to GCS, replaying the signed headers verbatim.
    await runBounded(missing, UPLOAD_CONCURRENCY, async ({ sha256, signed_url: url, headers }) => {
      const entry = bySha.get(sha256);
      if (!entry) return;
      await axios.put(url, readFileSync(entry.absPath), {
        headers: { ...(headers || {}), 'Content-Type': 'application/octet-stream' },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
    });

    // (4) /commit — finalize the build with the manifest.
    await axios.post(
      endpoint(apiUrl, buildId, '/commit'),
      { manifest: entries.map(e => ({ path: e.path, sha256: e.sha256 })) },
      { headers: authHeaders(token) }
    );

    log?.info?.(`Uploaded Storybook bundle for build #${buildId} (${entries.length} files, ${missing.length} new)`);
  } catch (err) {
    const status = err.response?.status;
    const detail = status ? `HTTP ${status}` : err.message;
    // A 403 feature_disabled is terminal but not a client upload failure worth a beacon.
    if (status === 403) {
      log?.warn?.(`Storybook bundle upload skipped: ${detail}`);
      return;
    }
    log?.warn?.(`Storybook bundle upload failed: ${detail}`);
    await sendFailureBeacon({ apiUrl, token, buildId, reason: 'client_failed', log });
  }
}

export default uploadStorybookBundle;
