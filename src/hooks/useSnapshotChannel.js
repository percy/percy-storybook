import { useState, useEffect, useRef } from 'react';
import { useChannel, useStorybookApi } from 'storybook/manager-api';
import { PERCY_EVENTS, SNAPSHOT_STATUS } from '../constants.js';
import { getCurrentStory } from '../utils/storybookApi.js';

/**
 * Manages the Storybook channel for Percy snapshot events.
 * Handles project config restore, snapshot lifecycle, and current story tracking.
 */
export function useSnapshotChannel(transition, view, VIEWS) {
  const api = useStorybookApi();
  const [snapshotStatus, setSnapshotStatus] = useState(SNAPSHOT_STATUS.IDLE);
  const [buildId, setBuildId] = useState('');
  const [buildUrl, setBuildUrl] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [snapshotError, setSnapshotError] = useState('');
  const [snapshotScope, setSnapshotScope] = useState('');
  const [currentStory, setCurrentStory] = useState(null);
  const restoreAttempted = useRef(false);
  const configLoaded = useRef(false);

  const emit = useChannel({
    [PERCY_EVENTS.PROJECT_CONFIG_LOADED]: ({ credentialsValid, username, accessKey, project, projectDetails, hasValidToken, lastBuild }) => {
      configLoaded.current = true;
      const creds = { username: username || '', accessKey: accessKey || '' };

      if (!credentialsValid) {
        transition('RESTORE_NONE');
        return;
      }
      if (!project || !hasValidToken) {
        transition('RESTORE_CREDS_ONLY', creds);
        return;
      }

      // Helper to hydrate channel state from a build object
      const hydrateFromBuild = (build) => {
        if (build.buildId) setBuildId(build.buildId);
        if (build.buildNumber) setBuildNumber(String(build.buildNumber));
        if (build.webUrl) setBuildUrl(build.webUrl);
      };

      // Has valid creds + project + token — check for last build
      if (lastBuild && (lastBuild.state === 'finished' || lastBuild.state === 'pending' || lastBuild.state === 'processing')) {
        hydrateFromBuild(lastBuild);
        transition('RESTORE_WITH_BUILD', { credentials: creds, project, projectDetails, lastBuild });
      } else {
        transition('RESTORE_FULL', { credentials: creds, project, projectDetails });
      }
    },
    [PERCY_EVENTS.SNAPSHOT_STARTED]: () => {
      setSnapshotStatus(SNAPSHOT_STATUS.RUNNING);
      setBuildId('');
      setBuildUrl('');
      setSnapshotError('');
    },
    [PERCY_EVENTS.SNAPSHOT_SUCCESS]: (data) => {
      // NOTE: Do NOT clear sidebar spinners here — SNAPSHOT_SUCCESS means snapshots
      // were uploaded, but the build is still processing. Spinners are cleared by
      // useBuildPolling when build state reaches FINISHED or FAILED.
      if (data?.buildId) setBuildId(data.buildId);
      if (data?.buildUrl) setBuildUrl(data.buildUrl);
      if (data?.buildNumber) setBuildNumber(data.buildNumber);
      setSnapshotStatus(SNAPSHOT_STATUS.SUCCESS);
      // Transition immediately — before React re-renders TriggerBuild.
      // This avoids the design-stack Alert crash in the RUNNING state render.
      transition('BUILD_STARTED');
    },
    [PERCY_EVENTS.SNAPSHOT_ERROR]: (data) => {
      // Clear sidebar spinners on error — build won't proceed (spread-merge preserves reviewStatus)
      if (window.__PERCY_SNAPSHOT_STATE__) {
        window.__PERCY_SNAPSHOT_STATE__ = {
          ...window.__PERCY_SNAPSHOT_STATE__,
          isRunning: false,
          storyIds: new Set()
        };
      }
      setSnapshotStatus(SNAPSHOT_STATUS.ERROR);
      setSnapshotError(data?.message || 'Snapshot failed');
    }
  });

  // Track current story selection
  useEffect(() => {
    const update = () => setCurrentStory(getCurrentStory(api));
    update();
    const unsub = api.on('storyChanged', update);
    return () => { if (unsub) unsub(); };
  }, [api]);

  // Startup restore: check for existing project config
  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;
    emit(PERCY_EVENTS.LOAD_PROJECT_CONFIG);

    // Timeout fallback — only fire if server never responded
    const timeout = setTimeout(() => {
      if (!configLoaded.current) transition('RESTORE_NONE');
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);

  /**
   * Called by TriggerBuild to store the human-readable scope label
   * (e.g. "InputField/InputWithAddOn") before emitting RUN_SNAPSHOT.
   */
  const setScope = (label) => setSnapshotScope(label);

  return { emit, snapshotStatus, buildId, buildUrl, buildNumber, snapshotError, snapshotScope, setScope, currentStory };
}
