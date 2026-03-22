import { useState, useEffect, useCallback, useRef } from 'react';

const PAGE_LIMIT = 30;
const BASE_URL = 'https://percy.io/api/v1/projects';
const DEBOUNCE_MS = 350;

/**
 * Hook to fetch Percy projects with debounced search and infinite scroll.
 * @param {string} username - BrowserStack username
 * @param {string} accessKey - BrowserStack access key
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
  const searchAbortRef = useRef(null);
  const paginationAbortRef = useRef(null);
  const tokenRef = useRef(btoa(`${username}:${accessKey}`));
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);

  // Keep refs in sync with state
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Update token if credentials change
  useEffect(() => {
    tokenRef.current = btoa(`${username}:${accessKey}`);
  }, [username, accessKey]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch when debounced search changes
  useEffect(() => {
    // Don't fetch without valid credentials
    if (!username || !accessKey) {
      setInitialLoading(false);
      return;
    }

    pageRef.current = 0;

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setLoading(true);
    setError('');

    fetchPage(tokenRef.current, debouncedSearch, 0, controller)
      .then(items => {
        if (controller.signal.aborted) return;
        setProjects(items);
        setHasMore(items.length >= PAGE_LIMIT);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) { setLoading(false); setInitialLoading(false); }
      });

    return () => controller.abort();
  }, [debouncedSearch]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    pageRef.current += 1;
    const page = pageRef.current;

    if (paginationAbortRef.current) paginationAbortRef.current.abort();
    const controller = new AbortController();
    paginationAbortRef.current = controller;

    setLoading(true);
    fetchPage(tokenRef.current, debouncedSearch, page, controller)
      .then(items => {
        if (controller.signal.aborted) return;
        setProjects(prev => [...prev, ...items]);
        setHasMore(items.length >= PAGE_LIMIT);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [debouncedSearch]);

  /** Cancel all in-flight requests and clear debounce. */
  const cancel = useCallback(() => {
    if (searchAbortRef.current) searchAbortRef.current.abort();
    if (paginationAbortRef.current) paginationAbortRef.current.abort();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      if (paginationAbortRef.current) paginationAbortRef.current.abort();
    };
  }, []);

  return { projects, loading, initialLoading, hasMore, error, search, setSearch, loadMore, cancel };
}

/** Fetch a single page of projects from the Percy API. */
async function fetchPage(token, searchTerm, page, controller) {
  const params = new URLSearchParams({
    'filter[product]': 'web',
    origin: 'percy_web',
    'page[limit]': String(PAGE_LIMIT),
    'page[offset]': String(page * PAGE_LIMIT)
  });
  if (searchTerm) params.set('filter[search]', searchTerm);

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: { Authorization: `Basic ${token}` },
    signal: controller.signal
  });
  if (!res.ok) throw new Error('Failed to load projects');
  const json = await res.json();

  return (json.data || []).map(p => ({
    id: p.id,
    name: p.attributes?.name || p.attributes?.slug || `Project ${p.id}`,
    updatedAt: p.attributes?.['updated-at'] || ''
  }));
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
