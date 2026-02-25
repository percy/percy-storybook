'use strict';

/**
 * Percy Storybook Addon – Preset (CommonJS)
 *
 * Storybook's preset loader requires() this file in its Node.js process.
 * It tells Storybook where to find the manager entry-point so the Percy
 * panel is injected into the browser bundle automatically.
 */

/**
 * Append ./manager.js to Storybook's manager bundle entries.
 *
 * @param {string[]} entry - existing entries array supplied by Storybook
 * @returns {string[]}
 */
function managerEntries(entry = []) {
  return [...entry, require.resolve('./manager.js')];
}

module.exports = { managerEntries };
