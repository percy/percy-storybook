import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Button, LoaderV2 } from '@browserstack/design-stack';
import { styled } from 'storybook/theming';
import { MemoryRouter } from 'react-router-dom';
import { ReviewViewerProvider, useSnapshotReview, useReviewViewerApi } from '@browserstack/review-viewer';
import ReviewSection from '@browserstack/review-viewer/modules/ReviewSection';
import { experimental_getStatusStore } from 'storybook/manager-api'; // eslint-disable-line camelcase
import { ADDON_ID } from '../constants.js';
import { getReviewStateDisplay, formatDiffPercent } from '../utils/reviewState.js';
import ReviewHeader, { SnapshotSelector } from './ReviewHeader.jsx';

/* ─── Styles ──────────────────────────────────────────────────────────── */

const ReviewWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const ReviewBody = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
`;

// Dummy Redux store — see comment in original for rationale
const dummyStore = configureStore({ reducer: () => ({}) });

/* ─── Review Content (inside provider, uses review-viewer hooks) ──────── */

function ReviewContent({ snapshotId, buildId, onReviewComplete }) {
  const api = useReviewViewerApi();
  const { data: snapshotData, isLoading, error } = api.useGetSnapshotQuery(snapshotId, {
    skip: !snapshotId
  });
  const reviewActions = useSnapshotReview(buildId, onReviewComplete);

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

  const [params, setParamsState] = useState({
    browser: null,
    width: null,
    viewLayout: 'side-by-side',
    diffMode: 'overlay'
  });

  // Local AI review toggle (no preference API in the addon)
  const [isAIReviewEnabled, setIsAIReviewEnabled] = useState(true);
  const onAIReviewToggle = useCallback((checked) => {
    setIsAIReviewEnabled(checked);
  }, []);

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
      isAIReviewEnabled={isAIReviewEnabled}
      onAIReviewToggle={onAIReviewToggle}
      isAIAvailable
    />
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */

export default function ReviewPage({
  buildId, buildNumber, buildMeta, webUrl, currentStoryId, currentStory, onBack, onApproved,
  groupedItems, authToken, itemsLoading: loading, itemsError: error, retryItems: retry,
  emit
}) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);

  // Update sidebar status + global review data when items are loaded
  useEffect(() => {
    if (!groupedItems?.length) return;
    const statusStore = experimental_getStatusStore(ADDON_ID); // eslint-disable-line camelcase
    const statuses = [];
    const storyIds = [];
    const reviewData = {};

    for (const group of groupedItems) {
      const { state, reason } = group.worstState;
      const maxDiff = Math.max(...group.snapshots.map(s => s.diffRatio || 0));
      const display = getReviewStateDisplay(state, reason);

      let status = 'success';
      if (state === 'failed' || state === 'error') status = 'error';
      else if (state === 'changes_requested' || state === 'unreviewed') status = 'warn';

      let description = display?.label || state?.replace('_', ' ') || '';
      if (maxDiff > 0) description = `${formatDiffPercent(maxDiff)} · ${description}`;

      storyIds.push(group.storyId);
      statuses.push({ storyId: group.storyId, typeId: ADDON_ID, status, title: 'Percy', description });

      // Store per-story review data for SidebarLabel rendering
      reviewData[group.storyId] = {
        diffRatio: maxDiff,
        reviewState: state,
        reviewStateReason: reason
      };
    }

    statusStore.set(statuses);

    // Expose review data globally for SidebarLabel
    window.__PERCY_SNAPSHOT_STATE__ = {
      ...window.__PERCY_SNAPSHOT_STATE__,
      reviewData
    };

    return () => {
      statusStore.unset(storyIds);
      if (window.__PERCY_SNAPSHOT_STATE__?.reviewData) {
        window.__PERCY_SNAPSHOT_STATE__ = {
          ...window.__PERCY_SNAPSHOT_STATE__,
          reviewData: {}
        };
      }
    };
  }, [groupedItems]);

  // Auto-select first snapshot or match current story
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

  const currentSnapshots = currentGroup?.snapshots || [];
  const handleReviewComplete = useCallback(() => {
    retry();
    if (onApproved) onApproved();
  }, [retry, onApproved]);

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
        <ReviewHeader
          buildNumber={buildNumber}
          webUrl={webUrl}
          buildId={buildId}
          reviewState={buildMeta?.reviewState}
          reviewStateReason={buildMeta?.reviewStateReason}
          currentSnapshots={[]}
          selectedSnapshotId={null}
          emit={emit}
          currentStory={currentStory}
          onBack={onBack}
          onApproved={onApproved}
        />
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
      <ReviewHeader
        buildNumber={buildNumber}
        webUrl={webUrl}
        buildId={buildId}
        reviewState={buildMeta?.reviewState}
        reviewStateReason={buildMeta?.reviewStateReason}
        currentSnapshots={currentSnapshots}
        selectedSnapshotId={selectedSnapshotId}
        emit={emit}
        currentStory={currentStory}
        onBack={onBack}
        onApproved={onApproved}
      />

      <ReviewBody>
        {authToken && selectedSnapshotId ? (
          <>
            {/* Overlay: superimpose snapshot dropdown over ReviewSectionHeader's SnapshotInfo (only when multiple snapshots) */}
            {currentSnapshots.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '62px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 10,
                  background: 'var(--ds-surface-default, #fff)'
                }}
              >
                <SnapshotSelector
                  snapshots={currentSnapshots}
                  selectedId={selectedSnapshotId}
                  onSelect={setSelectedSnapshotId}
                />
              </div>
            )}
            <Provider store={dummyStore}>
              <MemoryRouter>
                <ReviewViewerProvider
                  key={buildId}
                  apiBaseUrl="https://percy.io/api"
                  authToken={authToken}
                  authType="basic"
                  buildId={buildId}
                  snapshotId={selectedSnapshotId}
                  panels={{ ai: true, comments: true, history: true, regions: true, snapshotRules: true }}
                  permissions={{ canApproveSnapshot: true, canCommentSnapshot: true, canMergeSnapshot: true }}
                  onReviewComplete={handleReviewComplete}
                  headBranch={buildMeta?.headBranch || ''}
                  baseBranch={buildMeta?.baseBranch || ''}
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
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <LoaderV2 size="medium" showLabel label="Initializing review..." />
          </div>
        )}
      </ReviewBody>
    </ReviewWrapper>
  );
}
