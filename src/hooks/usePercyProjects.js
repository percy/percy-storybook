import { useState, useEffect, useCallback, useRef } from 'react';
import { useChannel } from 'storybook/manager-api';
import { PERCY_EVENTS } from '../constants.js';

const DEBOUNCE_MS = 350;

/**
 * Hook to fetch Percy projects via server channel with debounced search and pagination.
 * All API calls are made server-side — no credentials leave Node.js.
 *
 * @param {string} username - BrowserStack username
 * @param {string} accessKey - BrowserStack access key
 * @param {string} [initialSearch] - Initial search term
 */
export function usePercyProjects(username, accessKey, initialSearch = '') {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [error, setError] = useState('');
  const pageRef = useRef(0);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const debouncedSearchRef = useRef(debouncedSearch);

  // Keep refs in sync with state
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { debouncedSearchRef.current = debouncedSearch; }, [debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const emit = useChannel({
    [PERCY_EVENTS.PROJECTS_FETCHED]: ({ projects: items, hasMore: more, error: errMsg, search: respSearch, page }) => {
      // Ignore stale responses from a previous search term
      if (respSearch !== undefined && respSearch !== debouncedSearchRef.current) return;

      if (errMsg) {
        setError(errMsg);
        setLoading(false);
        setInitialLoading(false);
        return;
      }

      if (page === 0) {
        setProjects(items || []);
      } else {
        setProjects(prev => [...prev, ...(items || [])]);
      }
      setHasMore(!!more);
      setLoading(false);
      setInitialLoading(false);
    }
  });

  // Fetch when debounced search changes
  useEffect(() => {
    if (!username || !accessKey) {
      setInitialLoading(false);
      return;
    }

    pageRef.current = 0;
    setLoading(true);
    setError('');

    emit(PERCY_EVENTS.FETCH_PROJECTS, {
      username,
      accessKey,
      search: debouncedSearch,
      page: 0
    });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    pageRef.current += 1;

    setLoading(true);
    emit(PERCY_EVENTS.FETCH_PROJECTS, {
      username,
      accessKey,
      search: debouncedSearch,
      page: pageRef.current
    });
  }, [debouncedSearch, username, accessKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useCallback(() => {
    // Server-side requests can't be aborted via channel,
    // but we stop processing responses by resetting loading state
    setLoading(false);
  }, []);

  return { projects, loading, initialLoading, hasMore, error, search, setSearch, loadMore, cancel };
}

/**
 * Format a date string into a relative time (e.g., "Updated 5 mins ago").
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Updated ${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `Updated ${months} month${months > 1 ? 's' : ''} ago`;
}
