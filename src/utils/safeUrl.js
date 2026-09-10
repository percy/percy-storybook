/**
 * Percy Storybook Addon – manager-side URL guard (pure, no React).
 *
 * Build/project URLs arrive over the server channel. The server already
 * scheme-checks what it emits (server/utils.cjs safeWebUrl), but a forged
 * client-side emit bypasses the server entirely, so every `href` /
 * `window.open` in the manager re-checks here as defence in depth (F-023).
 */

/** Return `value` only if it is an absolute https: URL, else null. */
export function safeHttpsUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
