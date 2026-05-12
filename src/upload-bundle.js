/**
 * Storybook hosting POC — uploads the static Storybook directory as a zip
 * to Percy after a directory-mode `percy storybook` snapshot run.
 *
 * Talks to percy-api directly via axios (not via percy.client.post, which is
 * JSON-only). Reuses percy.client.token + percy.client.apiUrl so behavior
 * tracks the rest of the SDK as users override env vars.
 *
 * Best-effort: any failure is logged at warn and swallowed. Never throws.
 */

import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import FormData from 'form-data';
import axios from 'axios';

/**
 * Streams a directory into a single in-memory zip Buffer via `archiver`.
 * Resolves with the Buffer; rejects on archiver error.
 */
async function zipDirectory(directory) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    const sink = new PassThrough();

    archive.on('error', reject);
    sink.on('error', reject);
    sink.on('data', (chunk) => chunks.push(chunk));
    sink.on('end', () => resolve(Buffer.concat(chunks)));

    archive.pipe(sink);
    archive.directory(directory, false);
    archive.finalize();
  });
}

/**
 * POSTs the zipped Storybook directory to percy-api as multipart/form-data.
 *
 * @param {Object} args
 * @param {Object} args.percy   - the percy core instance (has .client with apiUrl + token)
 * @param {Object} args.log     - logger (warn/info)
 * @param {string} args.directory - absolute path to the static Storybook build dir
 * @param {string|number} args.buildId - the Percy build id
 */
export async function uploadStorybookBundle({ percy, log, directory, buildId }) {
  const apiUrl = percy?.client?.apiUrl;
  const token = percy?.client?.token;

  if (!apiUrl || !token || !buildId || !directory) {
    log?.warn?.(
      'Storybook bundle upload skipped: ' +
      `missing apiUrl=${!!apiUrl} token=${!!token} buildId=${!!buildId} directory=${!!directory}`
    );
    return;
  }

  let zipBuffer;
  try {
    zipBuffer = await zipDirectory(directory);
  } catch (err) {
    log?.warn?.(`Storybook bundle upload failed: zip creation error: ${err.message}`);
    return;
  }

  const form = new FormData();
  form.append('bundle', zipBuffer, { filename: 'bundle.zip', contentType: 'application/zip' });

  const url = `${apiUrl}/builds/${buildId}/storybook_bundle`;

  try {
    await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Token token=${token}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    log?.info?.(`Uploaded Storybook bundle for build #${buildId}`);
  } catch (err) {
    const status = err.response?.status;
    const detail = status ? `HTTP ${status}` : err.message;
    log?.warn?.(`Storybook bundle upload failed: ${detail}`);
  }
}

export default uploadStorybookBundle;
