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
  const [currentStory, setCurrentStory] = useState(null);
  const restoreAttempted = useRef(false);
  const configLoaded = useRef(false);

  const emit = useChannel({
    [PERCY_EVENTS.PROJECT_CONFIG_LOADED]: ({ credentialsValid, username, accessKey, project, hasValidToken }) => {
      configLoaded.current = true;
      const creds = { username: username || '', accessKey: accessKey || '' };
      if (credentialsValid && project && hasValidToken) {
        transition('RESTORE_FULL', { credentials: creds, project });
      } else if (credentialsValid) {
        transition('RESTORE_CREDS_ONLY', creds);
      } else {
        transition('RESTORE_NONE');
      }
    },
    [PERCY_EVENTS.SNAPSHOT_STARTED]: () => {
      setSnapshotStatus(SNAPSHOT_STATUS.RUNNING);
      setBuildId('');
      setBuildUrl('');
      setSnapshotError('');
    },
    [PERCY_EVENTS.SNAPSHOT_SUCCESS]: (data) => {
      if (data?.buildId) setBuildId(data.buildId);
      if (data?.buildUrl) setBuildUrl(data.buildUrl);
      if (data?.buildNumber) setBuildNumber(data.buildNumber);
      setSnapshotStatus(SNAPSHOT_STATUS.SUCCESS);
      // Transition immediately — before React re-renders TriggerBuild.
      // This avoids the design-stack Alert crash in the RUNNING state render.
      transition('BUILD_STARTED');
    },
    [PERCY_EVENTS.SNAPSHOT_ERROR]: (data) => {
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

  return { emit, snapshotStatus, buildId, buildUrl, buildNumber, snapshotError, currentStory };
}
