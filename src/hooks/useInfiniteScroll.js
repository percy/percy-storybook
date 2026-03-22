import { useRef, useCallback, useEffect } from 'react';

/**
 * Manages IntersectionObserver-based infinite scroll.
 * Returns a ref for the scroll container and a callback ref for the sentinel element.
 */
export function useInfiniteScroll(loadMore, loading) {
  const listRef = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(loading);

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const sentinelRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current) loadMore();
    }, { root: listRef.current, threshold: 0.1 });
    observerRef.current.observe(node);
  }, [loadMore]);

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return { listRef, sentinelRef };
}
