/**
 * Percy Storybook Addon – manager-side credential predicates (pure, no React).
 */

/**
 * Whether the project picker may fire FETCH_PROJECTS.
 *
 * The server prefers its own stored credentials (.env or the validated session
 * cache) and, since the F-017 fix, never sends the access key back to the
 * browser. So after a startup restore or "Change project" the browser holds
 * NO access key while the server holds a validated one — the fetch must still
 * fire in that case. The client-held pair is only required when the server
 * has nothing yet (the first-time / session-only flow), where it is sent as the
 * fallback the server uses before its cache is seeded.
 *
 * @param {string} username        client-held BrowserStack username ('' if none)
 * @param {string} accessKey       client-held BrowserStack access key ('' if none)
 * @param {boolean} storedOnServer server reported a validated stored pair
 */
export function canFetchProjects(username, accessKey, storedOnServer) {
  if (storedOnServer) return true;
  return !!(username && accessKey);
}

/**
 * Build the panel's credentials object from a PROJECT_CONFIG_LOADED payload.
 *
 * The server validates its stored pair on startup and reports only
 * `credentialsValid` — it deliberately does not send the access key back to
 * the browser (F-017). `storedOnServer` carries that fact forward so
 * credential-dependent views (project picker) know a fetch will succeed
 * server-side even though the client pair is empty.
 *
 * @param {{ credentialsValid?: boolean, username?: string, accessKey?: string }} payload
 */
export function credentialsFromConfigLoaded({ credentialsValid, username, accessKey } = {}) {
  return {
    username: username || '',
    accessKey: accessKey || '',
    storedOnServer: !!credentialsValid
  };
}
