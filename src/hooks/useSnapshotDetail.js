import { useState, useEffect, useRef, useCallback } from 'react';
import { useChannel } from 'storybook/manager-api';
import { PERCY_EVENTS } from '../constants.js';

/**
 * Fetches snapshot detail (denormalized JSON:API) via server channel.
 * Returns { snapshot, entities, isLoading, error }.
 */
export function useSnapshotDetail(snapshotId) {
  const [snapshot, setSnapshot] = useState(null);
  const [entities, setEntities] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeIdRef = useRef(null);

  const emit = useChannel({
    [PERCY_EVENTS.SNAPSHOT_DETAIL_FETCHED]: (data) => {
      if (data.snapshotId !== activeIdRef.current) return;
      if (data.error) {
        setError(data.error);
        setSnapshot(null);
        setEntities({});
      } else {
        setSnapshot(data.data);
        setEntities(data.entities || {});
        setError(null);
      }
      setIsLoading(false);
    }
  });

  useEffect(() => {
    if (!snapshotId) {
      setSnapshot(null);
      setEntities({});
      setIsLoading(false);
      setError(null);
      return;
    }
    activeIdRef.current = String(snapshotId);
    setIsLoading(true);
    setError(null);
    emit(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId });
  }, [snapshotId]);

  const refetch = useCallback(() => {
    if (!snapshotId) return;
    activeIdRef.current = String(snapshotId);
    setIsLoading(true);
    setError(null);
    emit(PERCY_EVENTS.FETCH_SNAPSHOT_DETAIL, { snapshotId });
  }, [snapshotId, emit]);

  return { snapshot, entities, isLoading, error, refetch };
}
