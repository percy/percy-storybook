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
 * Set or update a key=value in .env content string.
 * Escapes key for regex safety and rejects newlines in value.
 */
function setKey(src, key, value) {
  if (String(value).includes('\n')) throw new Error(`Invalid value for ${key}: contains newline`);
  const line = `${key}=${value}`;
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
  writeEnvRaw
};
