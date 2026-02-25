'use strict';

/**
 * Constants for Percy Storybook Addon (CommonJS)
 */

const ADDON_ID = 'percy-storybook';
const PANEL_ID = `${ADDON_ID}/panel`;
const PANEL_TITLE = 'Percy';

const PERCY_EVENTS = {
  RUN_SNAPSHOT: `${ADDON_ID}/run-snapshot`,
  STOP_SNAPSHOT: `${ADDON_ID}/stop-snapshot`,
  SNAPSHOT_STARTED: `${ADDON_ID}/snapshot-started`,
  SNAPSHOT_PROGRESS: `${ADDON_ID}/snapshot-progress`,
  SNAPSHOT_SUCCESS: `${ADDON_ID}/snapshot-success`,
  SNAPSHOT_ERROR: `${ADDON_ID}/snapshot-error`,
  SNAPSHOT_STOPPED: `${ADDON_ID}/snapshot-stopped`,
  LOG: `${ADDON_ID}/log`
};

const STORAGE_KEYS = {
  PERCY_TOKEN: 'percy_token'
};

const SNAPSHOT_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error'
};

const DEFAULT_WIDTHS = [375, 1280];

module.exports = {
  ADDON_ID,
  PANEL_ID,
  PANEL_TITLE,
  PERCY_EVENTS,
  STORAGE_KEYS,
  SNAPSHOT_STATUS,
  DEFAULT_WIDTHS
};
