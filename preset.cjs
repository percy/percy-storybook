'use strict';

const { registerCredentialHandlers } = require('./src/server/credentials.cjs');
const { registerProjectConfigHandlers } = require('./src/server/projectConfig.cjs');
const { registerSnapshotHandlers } = require('./src/server/snapshots.cjs');
const { registerPercyApiHandlers } = require('./src/server/percyApi.cjs');
const { registerBuildApiHandlers } = require('./src/server/buildApi.cjs');
const { registerBuildItemsHandlers } = require('./src/server/buildItems.cjs');
const { registerSnapshotDetailHandlers } = require('./src/server/snapshotDetail.cjs');

/**
 * Percy Storybook Addon – Preset (CommonJS)
 *
 * Registers the manager entry point and wires up server-channel handlers
 * for credentials, project config, and snapshot execution.
 */

function managerEntries(entry = []) {
  return [...entry, require.resolve('./dist/manager.js')];
}

// eslint-disable-next-line camelcase
const experimental_serverChannel = async function serverChannel(channel) {
  registerCredentialHandlers(channel);
  registerProjectConfigHandlers(channel);
  registerSnapshotHandlers(channel);
  registerPercyApiHandlers(channel);
  registerBuildApiHandlers(channel);
  registerBuildItemsHandlers(channel);
  registerSnapshotDetailHandlers(channel);

  // MUST return the channel — Storybook presets use a reducer pattern where
  // each preset's hook receives and must return the accumulated channel value.
  return channel;
};

module.exports = { managerEntries, experimental_serverChannel }; // eslint-disable-line camelcase
