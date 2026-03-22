'use strict';

const { registerCredentialHandlers } = require('./src/server/credentials.cjs');
const { registerProjectConfigHandlers } = require('./src/server/projectConfig.cjs');
const { registerSnapshotHandlers } = require('./src/server/snapshots.cjs');
const { registerPercyApiHandlers } = require('./src/server/percyApi.cjs');

/**
 * Percy Storybook Addon – Preset (CommonJS)
 *
 * Registers the manager entry point and wires up server-channel handlers
 * for credentials, project config, and snapshot execution.
 */

function managerEntries(entry = []) {
  return [...entry, require.resolve('./dist/manager.js')];
}

const experimental_serverChannel = async function serverChannel(channel) {
  registerCredentialHandlers(channel);
  registerProjectConfigHandlers(channel);
  registerSnapshotHandlers(channel);
  registerPercyApiHandlers(channel);

  // MUST return the channel — Storybook presets use a reducer pattern where
  // each preset's hook receives and must return the accumulated channel value.
  return channel;
};

module.exports = { managerEntries, experimental_serverChannel };
