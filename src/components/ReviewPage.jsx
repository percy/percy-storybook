import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Button, LoaderV2 } from '@browserstack/design-stack';
import { MdOutlineOpenInNew, MdKeyboardArrowDown, MdCheck } from '@browserstack/design-stack-icons';
import { styled } from 'storybook/theming';
import { MemoryRouter } from 'react-router-dom';
import { ReviewViewerProvider, useSnapshotReview, useReviewViewerApi } from '@browserstack/review-viewer';
import ReviewSection from '@browserstack/review-viewer/modules/ReviewSection';
import { experimental_getStatusStore } from 'storybook/manager-api';
import { ADDON_ID } from '../constants.js';

/* ─── Styles ──────────────────────────────────────────────────────────── */

const ReviewWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const ReviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid ${p => p.theme.appBorderColor};
  flex-shrink: 0;
`;

const ReviewBody = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
`;

// Dummy Redux store for the default ReactReduxContext.
// review-viewer's RTK Query hooks call useStore() via the default context
// (a bug — it should use the custom reviewViewerStoreContext). In the Percy
// frontend app this works because there's already a global Redux Provider.
// In our Storybook addon there isn't one, so we provide a minimal store
// to prevent the null context crash.
const dummyStore = configureStore({ reducer: () => ({}) });

/* ─── Snapshot Selector (inline) ─────────────────────────────────────── */

function SnapshotSelector({ snapshots, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = snapshots.find(s => s.id === selectedId) || snapshots[0];

  if (!snapshots.length) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-default bg-raised-default hover:bg-neutral-weakest text-sm font-medium cursor-pointer"
      >
        <span className="truncate max-w-[200px]">{selected?.name || 'Select snapshot'}</span>
        {snapshots.length > 1 && <MdKeyboardArrowDown className="w-4 h-4" />}
      </button>

      {open && snapshots.length > 1 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[320px] bg-raised-default border border-neutral-default rounded-lg shadow-lg py-1 max-h-[300px] overflow-y-auto">
            {snapshots.map(snap => (
              <button
                key={snap.id}
                onClick={() => { onSelect(snap.id); setOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-neutral-weakest cursor-pointer"
              >
                <span className="w-4 flex-shrink-0">
                  {snap.id === selectedId && <MdCheck className="w-4 h-4 text-brand-default" />}
                </span>
                <span className="flex-1 truncate">{snap.name}</span>
                <span className="text-xs text-neutral-weak capitalize">
                  {snap.reviewState?.replace('_', ' ') || ''}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Review Content (inside provider, uses review-viewer hooks) ──────── */

function ReviewContent({ snapshotId, buildId, onReviewComplete }) {
  const api = useReviewViewerApi();
  const { data: snapshotData, isLoading, error } = api.useGetSnapshotQuery(snapshotId, {
    skip: !snapshotId
  });
  const reviewActions = useSnapshotReview(buildId, onReviewComplete);

  // Fetch diff regions once snapshot comparisons are available
  const comparisonIds = useMemo(
    () => snapshotData?.data?.comparisons ?? [],
    [snapshotData?.data?.comparisons]
  );
  const { data: diffRegionsData } = api.useGetDiffRegionsQuery(
    { buildId, comparisonIds },
    { skip: !buildId || !comparisonIds.length }
  );
  const diffRegions = Array.isArray(diffRegionsData)
    ? diffRegionsData
    : (diffRegionsData?.data ?? null);

  // Viewer params — controls browser/width selection
  const [params, setParamsState] = useState({
    browser: null,
    width: null,
    viewLayout: 'side-by-side',
    diffMode: 'overlay'
  });

  const setParam = useCallback((key, value) => {
    setParamsState(prev => ({ ...prev, [key]: value }));
  }, []);

  const setParams = useCallback((updates) => {
    setParamsState(prev => ({ ...prev, ...updates }));
  }, []);

  if (isLoading || !snapshotData) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderV2 size="medium" showLabel label="Loading snapshot..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-danger-default">Failed to load snapshot</div>
      </div>
    );
  }

  return (
    <ReviewSection
      snapshot={snapshotData?.data}
      entities={snapshotData?.entities}
      diffRegions={diffRegions}
      isLoading={isLoading}
      params={params}
      setParam={setParam}
      setParams={setParams}
      reviewActions={reviewActions}
    />
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */

export default function ReviewPage({
  buildId, buildNumber, buildMeta, webUrl, currentStoryId, onBack,
  groupedItems, authToken, itemsLoading: loading, itemsError: error, retryItems: retry
}) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);

  // Update sidebar status when items are loaded
  useEffect(() => {
    if (!groupedItems?.length) return;
    const statusStore = experimental_getStatusStore(ADDON_ID);
    const statuses = [];
    const storyIds = [];
    for (const group of groupedItems) {
      const { state, reason } = group.worstState;
      const maxDiff = Math.max(...group.snapshots.map(s => s.diffRatio || 0));
      let status = 'success';
      if (state === 'failed' || state === 'error') status = 'error';
      else if (state === 'changes_requested' || state === 'unreviewed') status = 'warn';

      let description = reason === 'no_diffs' ? 'No changes' : state?.replace('_', ' ');
      if (maxDiff > 0) description = `${(maxDiff * 100).toFixed(2)}% diff · ${description}`;

      storyIds.push(group.storyId);
      statuses.push({ storyId: group.storyId, typeId: ADDON_ID, status, title: 'Percy', description });
    }
    statusStore.set(statuses);
    return () => statusStore.unset(storyIds);
  }, [groupedItems]);

  // Auto-select first snapshot or match current story
  // cover-snapshot-display-name uses Storybook story ID format
  useEffect(() => {
    if (!groupedItems?.length) return;
    const group = currentStoryId
      ? groupedItems.find(g => g.storyId === currentStoryId)
      : null;
    const target = group || groupedItems[0];
    if (target && target.snapshots.length) {
      setCurrentGroup(target);
      setSelectedSnapshotId(target.snapshots[0].id);
    }
  }, [currentStoryId, groupedItems]);

  // Derive current snapshots list for the selector
  const currentSnapshots = currentGroup?.snapshots || [];

  const handleReviewComplete = useCallback(() => {
    // Refetch build items to update snapshot selector badges and sidebar status
    retry();
  }, [retry]);

  // Loading state
  if (loading) {
    return (
      <ReviewWrapper>
        <div className="flex items-center justify-center h-full">
          <LoaderV2 size="medium" showLabel label="Loading review data..." />
        </div>
      </ReviewWrapper>
    );
  }

  // Error state
  if (error) {
    return (
      <ReviewWrapper>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="p-3 rounded-md bg-danger-weaker text-danger-default text-sm">
            Failed to load build items: {error}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="small" onClick={retry}>Retry</Button>
            <Button variant="minimal" size="small" onClick={onBack}>Run new test</Button>
          </div>
        </div>
      </ReviewWrapper>
    );
  }

  // No items
  if (!groupedItems?.length) {
    return (
      <ReviewWrapper>
        <ReviewHeader>
          <span className="text-lg font-semibold">#{buildNumber}</span>
          <Button variant="minimal" size="small" onClick={onBack}>Run new test</Button>
        </ReviewHeader>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="p-3 rounded-md bg-neutral-weakest text-neutral-default text-sm">
            No snapshots found in this build.
          </div>
        </div>
      </ReviewWrapper>
    );
  }

  return (
    <ReviewWrapper>
      <ReviewHeader>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">#{buildNumber}</span>
          <SnapshotSelector
            snapshots={currentSnapshots}
            selectedId={selectedSnapshotId}
            onSelect={setSelectedSnapshotId}
          />
        </div>
        <div className="flex items-center gap-3">
          {webUrl && (
            <a href={webUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="minimal" size="small" icon={<MdOutlineOpenInNew />} iconPlacement="end">
                Review in Percy
              </Button>
            </a>
          )}
          <Button variant="minimal" size="small" onClick={onBack}>Run new test</Button>
        </div>
      </ReviewHeader>

      <ReviewBody>
        {authToken && selectedSnapshotId ? (
          <Provider store={dummyStore}>
            <MemoryRouter>
              <ReviewViewerProvider
                key={buildId}
                apiBaseUrl="https://percy.io/api"
                authToken={authToken}
                authType="basic"
                buildId={buildId}
                snapshotId={selectedSnapshotId}
                panels={{ ai: false, comments: false, history: false, regions: false, snapshotRules: false }}
                onReviewComplete={handleReviewComplete}
                buildAttributes={{
                  reviewState: buildMeta?.reviewState,
                  reviewStateReason: buildMeta?.reviewStateReason
                }}
              >
                <ReviewContent
                snapshotId={selectedSnapshotId}
                buildId={buildId}
                onReviewComplete={handleReviewComplete}
              />
              </ReviewViewerProvider>
            </MemoryRouter>
          </Provider>
        ) : (
          <div className="flex items-center justify-center h-full">
            <LoaderV2 size="medium" showLabel label="Initializing review..." />
          </div>
        )}
      </ReviewBody>
    </ReviewWrapper>
  );
}
