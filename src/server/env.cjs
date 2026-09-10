'use strict';

const fs = require('fs');
const path = require('path');

/* ─── Path helpers ─────────────────────────────────────────────────────── */

function getEnvPath() {
  return path.join(process.cwd(), '.env');
}

function getPercyYmlPath() {
  return path.join(process.cwd(), '.percy.yml');
}

/* ─── .env parsing / writing ───────────────────────────────────────────── */

/**
 * Parse a .env file into a key→value map (ignores comments / blank lines).
 */
function parseEnv(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return result;
}

/**
 * Reject values that would corrupt .env for this parser or for downstream
 * dotenv-style parsers (F-018, CWE-93):
 *  - '\n' / '\r'   → line break: the remainder becomes a new KEY=VALUE line
 *  - '#'           → comment marker: dotenv drops the remainder of the value
 *  - '='           → split-on-first-'=' ambiguity in naive parsers
 *  - '\0'          → null byte
 *  - leading/trailing whitespace → silently trimmed by some parsers, not others
 * Every value written here is a BrowserStack username, an access key, a Percy
 * token or a numeric build id, none of which legitimately contain these.
 */
function assertSafeEnvValue(key, value) {
  const str = String(value);
  const reason =
    str.includes('\n') ? 'contains newline'
      : str.includes('\r') ? 'contains carriage return'
        : str.includes('\0') ? 'contains null byte'
          : str.includes('#') ? "contains '#'"
            : str.includes('=') ? "contains '='"
              : str !== str.trim() ? 'has leading or trailing whitespace'
                : null;
  if (reason) throw new Error(`Invalid value for ${key}: ${reason}`);
  return str;
}

/**
 * Set or update a key=value in .env content string.
 * Rejects values that would break the file (see assertSafeEnvValue).
 */
function setKey(src, key, value) {
  const line = `${key}=${assertSafeEnvValue(key, value)}`;
  const lines = src.split('\n');
  const prefix = `${key}=`;
  const idx = lines.findIndex(l => l.trimStart().startsWith(prefix));
  if (idx !== -1) {
    lines[idx] = line;
    return lines.join('\n');
  }
  return src.trim() ? `${src.trim()}\n${line}\n` : `${line}\n`;
}

/**
 * Read and parse the .env file. Returns {} if it doesn't exist.
 */
function readEnv() {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return {};
  return parseEnv(fs.readFileSync(envPath, 'utf8'));
}

/**
 * Read raw .env content. Returns '' if file doesn't exist.
 */
function readEnvRaw() {
  const envPath = getEnvPath();
  return fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
}

/**
 * Write raw content to .env.
 */
function writeEnvRaw(content) {
  fs.writeFileSync(getEnvPath(), content, 'utf8');
}

module.exports = {
  getEnvPath,
  getPercyYmlPath,
  parseEnv,
  setKey,
  readEnv,
  readEnvRaw,
  writeEnvRaw, assertSafeEnvValue };
