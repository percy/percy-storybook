import { useState, useEffect, useRef, useMemo } from 'react';
import { useChannel, useStorybookApi } from 'storybook/manager-api';
import { PERCY_EVENTS, BUILD_STATES, PANEL_ID } from '../constants.js';

const POLL_INTERVAL_MS = 10000;
const TIME_UPDATE_INTERVAL_MS = 60000;

/* ─── Formatting helpers ──────────────────────────────────────────────── */

function formatElapsedTime(createdAt, currentTime) {
  if (!createdAt) return '0 min';
  const ms = currentTime - new Date(createdAt).getTime();
  if (ms < 0) return '0 min';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours} hr ${minutes % 60} min`;
  return `${minutes} min`;
}

function formatAvgDuration(seconds) {
  if (!seconds) return null;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  if (min > 0) return `${min} min${sec > 0 ? ` ${sec} sec` : ''}`;
  return `${sec} sec`;
}

/* ─── Hook ────────────────────────────────────────────────────────────── */

/**
 * Polls Percy Build API for build status updates.
 * Uses recursive setTimeout (not setInterval) to prevent request stacking.
 * All mutable state accessed in useChannel handlers uses refs to avoid stale closures.
 */
export function useBuildPolling(buildId) {
  const api = useStorybookApi();
  const [buildData, setBuildData] = useState(null);
  const [pollError, setPollError] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [logDownload, setLogDownload] = useState({ loading: false, error: null });

  // Refs for stale closure prevention (useChannel registers handlers once)
  const buildIdRef = useRef(buildId);
  const buildStateRef = useRef(null);
  useEffect(() => { buildIdRef.current = buildId; }, [buildId]);

  // Channel handler — stable reference, reads refs not state
  const emit = useChannel({
    [PERCY_EVENTS.BUILD_STATUS_FETCHED]: (data) => {
      if (data.buildId !== buildIdRef.current) return; // stale response
      if (data.error) {
        setPollError(true);
        return;
      }
      setPollError(false);
      buildStateRef.current = data.state;
      setBuildData(data);

      // Clear sidebar spinners when build reaches a terminal state
      if (data.state === BUILD_STATES.FINISHED || data.state === BUILD_STATES.FAILED) {
        if (window.__PERCY_SNAPSHOT_STATE__) {
          window.__PERCY_SNAPSHOT_STATE__ = { isRunning: false, storyIds: new Set() };
        }
      }
    },
    [PERCY_EVENTS.BUILD_LOGS_FETCHED]: (data) => {
      if (data.error) {
        setLogDownload({ loading: false, error: data.error });
        return;
      }
      setLogDownload({ loading: false, error: null });
      triggerFileDownload(data.content, data.filename);
    }
  });

  // Polling via recursive setTimeout
  useEffect(() => {
    if (!buildId) return;
    let timeoutId = null;
    let canceled = false;

    const poll = () => {
      if (canceled) return;
      const st = buildStateRef.current;
      if (st === BUILD_STATES.FAILED || st === BUILD_STATES.FINISHED) return;
      // Pause when panel is not selected (panels stay mounted in SB8)
      if (api.getSelectedPanel() !== PANEL_ID) {
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }
      emit(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId: buildIdRef.current });
      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    };

    // Immediate first fetch
    emit(PERCY_EVENTS.FETCH_BUILD_STATUS, { buildId });
    timeoutId = setTimeout(poll, POLL_INTERVAL_MS);

    return () => { canceled = true; clearTimeout(timeoutId); };
  }, [buildId]);

  // Elapsed time timer — 60s interval
  useEffect(() => {
    if (!buildData?.createdAt) return;
    const st = buildStateRef.current;
    if (st === BUILD_STATES.FAILED || st === BUILD_STATES.FINISHED) return;
    const id = setInterval(() => setCurrentTime(Date.now()), TIME_UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [buildData?.createdAt, buildData?.state]);

  // Derived state (memoized)
  const elapsedTime = useMemo(
    () => formatElapsedTime(buildData?.createdAt, currentTime),
    [buildData?.createdAt, currentTime]
  );
  const avgBuildTime = useMemo(
    () => formatAvgDuration(buildData?.averageDuration),
    [buildData?.averageDuration]
  );
  const progressPercent = useMemo(
    () => buildData?.totalComparisons > 0
      ? Math.round((buildData.totalComparisonsFinished / buildData.totalComparisons) * 100)
      : 0,
    [buildData?.totalComparisons, buildData?.totalComparisonsFinished]
  );

  const downloadLogs = () => {
    if (logDownload.loading) return;
    setLogDownload({ loading: true, error: null });
    emit(PERCY_EVENTS.FETCH_BUILD_LOGS, { buildId });
  };

  return {
    buildData,
    state: buildData?.state ?? null,
    elapsedTime,
    avgBuildTime,
    progressPercent,
    pollError,
    downloadLogs,
    logDownload
  };
}

/* ─── File download utility ───────────────────────────────────────────── */

function triggerFileDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
