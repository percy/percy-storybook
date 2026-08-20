'use strict';

const { registerCredentialHandlers } = require('./src/server/credentials.cjs');
const { registerProjectConfigHandlers } = require('./src/server/projectConfig.cjs');
const { registerSnapshotHandlers } = require('./src/server/snapshots.cjs');
const { registerPercyApiHandlers } = require('./src/server/percyApi.cjs');
const { registerBuildApiHandlers } = require('./src/server/buildApi.cjs');
const { registerBuildItemsHandlers } = require('./src/server/buildItems.cjs');
const { registerSnapshotDetailHandlers } = require('./src/server/snapshotDetail.cjs');
const { getOrCreateNonce, guardChannel } = require('./src/server/channelAuth.cjs');
const { CHANNEL_AUTH } = require('./src/constants.cjs');

/**
 * Percy Storybook Addon – Preset (CommonJS)
 *
 * Registers the manager entry point and wires up server-channel handlers
 * for credentials, project config, and snapshot execution.
 */

// One nonce per Storybook process. Injected into the legitimate manager
// document via `managerHead` and required on every state-mutating channel
// event via `guardChannel`, so forged/cross-origin events are rejected.
const CHANNEL_NONCE = getOrCreateNonce();

function managerEntries(entry = []) {
  return [...entry, require.resolve('./dist/manager.js')];
}

// eslint-disable-next-line camelcase
const experimental_serverChannel = async function serverChannel(channel) {
  // Gate state-mutating events behind the nonce before the handlers see them.
  const guarded = guardChannel(channel, CHANNEL_NONCE);

  registerCredentialHandlers(guarded);
  registerProjectConfigHandlers(guarded);
  registerSnapshotHandlers(guarded);
  registerPercyApiHandlers(guarded);
  registerBuildApiHandlers(guarded);
  registerBuildItemsHandlers(guarded);
  registerSnapshotDetailHandlers(guarded);

  // MUST return the channel — Storybook presets use a reducer pattern where
  // each preset's hook receives and must return the accumulated channel value.
  return channel;
};

// Inject the per-process nonce into the manager document head. The manager is
// served same-origin by the Storybook dev server, so only its own scripts can
// read this <meta>; a cross-origin drive-by page cannot, and therefore cannot
// forge a valid privileged channel event.
function managerHead(head = '') {
  return `${head}\n<meta name="${CHANNEL_AUTH.META_NAME}" content="${CHANNEL_NONCE}">`;
}

// eslint-disable-next-line camelcase
module.exports = { managerEntries, experimental_serverChannel, managerHead };
