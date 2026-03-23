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

function basicAuth(username, accessKey) {
  return Buffer.from(`${username}:${accessKey}`).toString('base64');
}

module.exports = { PERCY_API_BASE, validateBuildId, basicAuth };
