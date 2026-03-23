import { useEffect, useRef } from 'react';

/**
 * Reactive view switching driven by story navigation + build items.
 *
 * When a previous build is loaded, this hook automatically transitions
 * between REVIEW and TRIGGER_BUILD as the user navigates stories:
 * - Story has a matching snapshot → SNAPSHOT_MATCHED → REVIEW
 * - Story has no matching snapshot → SNAPSHOT_UNMATCHED → TRIGGER_BUILD
 *
 * Uses requestAnimationFrame to debounce rapid story navigation and
 * prevent view flicker from intermediate transitions.
 *
 * NOTE: Percy's cover-snapshot-display-name uses Storybook story ID format
 * (e.g. "example-button--primary"), so matching is done via story.id.
 */
export function useAutoViewSwitch({ currentStory, storyIdSet, itemsLoading, hasPreviousBuild, view, transition, VIEWS }) {
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  const pendingRef = useRef(null);

  useEffect(() => {
    // Cancel any pending transition from previous render
    if (pendingRef.current) {
      cancelAnimationFrame(pendingRef.current);
      pendingRef.current = null;
    }

    // Guards: must have build data, items loaded, and a valid story
    if (!hasPreviousBuild || !storyIdSet.size || itemsLoading) return;
    if (!currentStory?.id) return;
    const currentView = viewRef.current;
    if (currentView === VIEWS.BUILD_PROGRESS || currentView === VIEWS.INITIALIZING) return;

    // cover-snapshot-display-name uses Storybook story ID format (e.g. "example-button--primary")
    const hasMatch = storyIdSet.has(currentStory.id);

    // Debounce: wait one animation frame for React to settle state
    pendingRef.current = requestAnimationFrame(() => {
      pendingRef.current = null;
      const latestView = viewRef.current;
      if (hasMatch && latestView !== VIEWS.REVIEW) {
        transition('SNAPSHOT_MATCHED');
      } else if (!hasMatch && latestView === VIEWS.REVIEW) {
        transition('SNAPSHOT_UNMATCHED');
      }
    });

    return () => {
      if (pendingRef.current) {
        cancelAnimationFrame(pendingRef.current);
        pendingRef.current = null;
      }
    };
  }, [currentStory?.id, storyIdSet, itemsLoading, hasPreviousBuild]);
  // NOTE: view intentionally excluded — use viewRef to avoid re-triggering from own transitions
}
