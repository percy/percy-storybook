import { useState, useEffect, useRef, useMemo } from 'react';
import { useChannel } from 'storybook/manager-api';
import { PERCY_EVENTS } from '../constants.js';

/* ─── Grouping helpers ───────────────────────────────────────────────── */

/**
 * Group build items by cover-snapshot-display-name.
 * Percy uses "Title: Name" format (e.g. "Example/Button: Primary").
 * Items sharing the same display-name are variants of the same story.
 */
function groupByDisplayName(items) {
  if (!items) return [];
  const groups = {};
  for (const item of items) {
    const attrs = item.attributes;
    const key = attrs['cover-snapshot-display-name'];
    if (!groups[key]) {
      groups[key] = { storyId: key, snapshots: [] };
    }
    groups[key].snapshots.push({
      id: attrs['cover-snapshot-id'],
      name: attrs['cover-snapshot-name'],
      displayName: attrs['cover-snapshot-display-name'],
      diffRatio: attrs['max-diff-ratio'],
      reviewState: attrs['review-state'],
      reviewStateReason: attrs['review-state-reason'],
      comparisonId: attrs['comparison-id'],
      comparisonIds: attrs['comparison-ids'],
      thumbnailUrl: attrs['cover-head-screenshot-lossy-image-url']
    });
  }
  // Compute worst state per group for sidebar aggregation
  for (const group of Object.values(groups)) {
    group.worstState = worstState(group.snapshots);
  }
  return Object.values(groups);
}

/**
 * Pick the "worst" review state from a list of snapshots.
 * Any non-approved state wins; otherwise use the first snapshot's state.
 */
function worstState(snapshots) {
  const nonApproved = snapshots.find(s =>
    s.reviewState !== 'approved' || s.reviewStateReason !== 'no_diffs'
  );
  return nonApproved
    ? { state: nonApproved.reviewState, reason: nonApproved.reviewStateReason }
    : { state: snapshots[0]?.reviewState || 'unreviewed', reason: snapshots[0]?.reviewStateReason };
}

/* ─── Hook ────────────────────────────────────────────────────────────── */

/**
 * Fetches build items and auth token from the server via channel.
 * Groups items by display-name for story-level navigation.
 *
 * Designed to be hoisted to PercyPanel level — handles null buildId
 * gracefully and re-fetches when buildId changes (e.g. new build).
 */
export function useBuildItems(buildId, buildMeta) {
  const [buildItems, setBuildItems] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const buildIdRef = useRef(buildId);
  const mountedRef = useRef(true);
  const fetchedForRef = useRef(null); // keyed by buildId, not boolean

  useEffect(() => { buildIdRef.current = buildId; }, [buildId]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const emit = useChannel({
    [PERCY_EVENTS.BUILD_ITEMS_FETCHED]: (data) => {
      if (!mountedRef.current) return;
      if (data.buildId !== buildIdRef.current) return;
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setBuildItems(data.items);
      setAuthToken(data.authToken);
      setLoading(false);
    }
  });

  // Fetch when buildId changes — skip if null or already fetched for this buildId
  useEffect(() => {
    if (!buildId || fetchedForRef.current === buildId) return;
    fetchedForRef.current = buildId;
    setLoading(true);
    setError(null);
    emit(PERCY_EVENTS.FETCH_BUILD_ITEMS, { buildId, meta: buildMeta?.meta || buildMeta });
  }, [buildId]);

  // Group items by display name → Percy snapshot name ("Title: Name")
  const groupedItems = useMemo(() => groupByDisplayName(buildItems), [buildItems]);

  // O(1) lookup set for story matching in useAutoViewSwitch
  const storyIdSet = useMemo(
    () => new Set(groupedItems.map(g => g.storyId)),
    [groupedItems]
  );

  const retry = () => {
    setError(null);
    setLoading(true);
    fetchedForRef.current = null;
    emit(PERCY_EVENTS.FETCH_BUILD_ITEMS, { buildId, meta: buildMeta?.meta || buildMeta });
  };

  const reset = () => {
    setBuildItems(null);
    setAuthToken(null);
    setLoading(true);
    setError(null);
    fetchedForRef.current = null;
  };

  return { groupedItems, storyIdSet, authToken, loading, error, rawItems: buildItems, retry, reset };
}
