/**
 * Constants for Percy Storybook Addon
 */

export const ADDON_ID = 'percy-storybook';
export const PANEL_ID = `${ADDON_ID}/panel`;
export const PANEL_TITLE = 'Percy';

// Channel events for communication between UI and server
export const PERCY_EVENTS = {
  RUN_SNAPSHOT: `${ADDON_ID}/run-snapshot`,
  STOP_SNAPSHOT: `${ADDON_ID}/stop-snapshot`,
  SNAPSHOT_STARTED: `${ADDON_ID}/snapshot-started`,
  SNAPSHOT_PROGRESS: `${ADDON_ID}/snapshot-progress`,
  SNAPSHOT_SUCCESS: `${ADDON_ID}/snapshot-success`,
  SNAPSHOT_ERROR: `${ADDON_ID}/snapshot-error`,
  SNAPSHOT_STOPPED: `${ADDON_ID}/snapshot-stopped`,
  LOG: `${ADDON_ID}/log`
};

export const STORAGE_KEYS = {
  PERCY_TOKEN: 'percy_token'
};

export const SNAPSHOT_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error'
};

export const DEFAULT_WIDTHS = [375, 1280];
