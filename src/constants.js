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
  LOG: `${ADDON_ID}/log`,
  // BrowserStack credentials
  LOAD_BS_CREDENTIALS: `${ADDON_ID}/load-bs-credentials`,
  BS_CREDENTIALS_LOADED: `${ADDON_ID}/bs-credentials-loaded`,
  SAVE_BS_CREDENTIALS: `${ADDON_ID}/save-bs-credentials`,
  BS_CREDENTIALS_SAVED: `${ADDON_ID}/bs-credentials-saved`,
  // Project config
  SAVE_PROJECT_CONFIG: `${ADDON_ID}/save-project-config`,
  PROJECT_CONFIG_SAVED: `${ADDON_ID}/project-config-saved`,
  LOAD_PROJECT_CONFIG: `${ADDON_ID}/load-project-config`,
  PROJECT_CONFIG_LOADED: `${ADDON_ID}/project-config-loaded`,
  // Percy API (server-side)
  VALIDATE_CREDENTIALS: `${ADDON_ID}/validate-credentials`,
  CREDENTIALS_VALIDATED: `${ADDON_ID}/credentials-validated`,
  FETCH_PROJECTS: `${ADDON_ID}/fetch-projects`,
  PROJECTS_FETCHED: `${ADDON_ID}/projects-fetched`,
  CREATE_PROJECT: `${ADDON_ID}/create-project`,
  PROJECT_CREATED: `${ADDON_ID}/project-created`,
  // Build progress polling
  FETCH_BUILD_STATUS: `${ADDON_ID}/fetch-build-status`,
  BUILD_STATUS_FETCHED: `${ADDON_ID}/build-status-fetched`,
  FETCH_BUILD_LOGS: `${ADDON_ID}/fetch-build-logs`,
  BUILD_LOGS_FETCHED: `${ADDON_ID}/build-logs-fetched`,
  // Build items + auth (review page)
  FETCH_BUILD_ITEMS: `${ADDON_ID}/fetch-build-items`,
  BUILD_ITEMS_FETCHED: `${ADDON_ID}/build-items-fetched`,
  // Snapshot detail (review page)
  FETCH_SNAPSHOT_DETAIL: `${ADDON_ID}/fetch-snapshot-detail`,
  SNAPSHOT_DETAIL_FETCHED: `${ADDON_ID}/snapshot-detail-fetched`
};

export const STORAGE_KEYS = {
  PERCY_TOKEN: 'percy_token',
  BS_USERNAME: 'browserstack_username',
  BS_ACCESS_KEY: 'browserstack_access_key'
};

export const SNAPSHOT_TYPES = {
  FULL: 'full',
  CURRENT_STORY: 'current_story',
  CURRENT_TREE: 'current_tree'
};

export const SNAPSHOT_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error'
};

export const BUILD_STATES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  FAILED: 'failed',
  FINISHED: 'finished'
};

export const DEFAULT_WIDTHS = [375, 1280];
