import React, { useEffect, useState } from 'react';
import { styled } from 'storybook/theming';
import { getReviewStateDisplay, formatDiffPercent, getDotColor } from '../utils/reviewState.js';

/* ─── Review-state priority for component-group aggregation ──────────── */

const STATE_PRIORITY = {
  error: 0,
  changes_requested: 1,
  unreviewed: 2,
  approved: 3
};

function getWorstReviewState(reviewData, childIds) {
  let worst = null;
  for (const id of childIds) {
    const data = reviewData[id];
    if (!data) continue;
    const priority = STATE_PRIORITY[data.reviewState] ?? 2;
    if (!worst || priority < worst.priority) {
      worst = { priority, state: data.reviewState, reason: data.reviewStateReason };
    }
  }
  return worst;
}

/* ─── Styles ──────────────────────────────────────────────────────────── */

const LabelWrapper = styled.span`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
`;

const TopRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
`;

const StoryName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const Spinner = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #e0e0e0;
  border-top-color: #1ea7fd;
  border-radius: 50%;
  flex-shrink: 0;
  animation: percy-spin 0.8s linear infinite;

  @keyframes percy-spin {
    to { transform: rotate(360deg); }
  }
`;

const StatusDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: ${props => props.color};
`;

const ErrorIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: #EF4444;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
`;

const Subtitle = styled.span`
  font-size: 11px;
  line-height: 1.2;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* Inherit white text when story is selected (blue background) */
  [aria-current="page"] &,
  [data-selected="true"] & {
    color: inherit;
  }
`;

const DiffText = styled.span`
  color: ${props => props.color || '#999'};

  [aria-current="page"] &,
  [data-selected="true"] & {
    color: inherit;
  }
`;

/* ─── Component ───────────────────────────────────────────────────────── */

/**
 * Custom sidebar label renderer for Percy.
 * - Stories: shows diff%, review state subtitle, and colored status dot
 * - Component groups: shows aggregated worst-state dot from child stories
 * - During capture: shows spinner instead of review info
 */
export function SidebarLabel({ item }) {
  const [labelState, setLabelState] = useState({
    isCapturing: false,
    reviewInfo: null,
    componentDotColor: null
  });

  useEffect(() => {
    const isStory = item.type === 'story';
    const isComponent = item.type === 'component';
    if (!isStory && !isComponent) return;

    const check = () => {
      const state = window.__PERCY_SNAPSHOT_STATE__;
      const next = { isCapturing: false, reviewInfo: null, componentDotColor: null };

      if (isStory) {
        // Capture spinner
        next.isCapturing = !!(state?.isRunning && state.storyIds?.has(item.id));
        // Review data
        next.reviewInfo = state?.reviewData?.[item.id] || null;
      }

      if (isComponent && state?.reviewData) {
        // Aggregate worst state from child stories
        const childIds = item.children || [];
        const worst = getWorstReviewState(state.reviewData, childIds);
        if (worst) {
          const display = getReviewStateDisplay(worst.state, worst.reason);
          next.componentDotColor = display ? getDotColor(display.color) : null;
        }
      }

      setLabelState(next);
    };

    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [item.id, item.type, item.children]);

  const { isCapturing, reviewInfo, componentDotColor } = labelState;

  // Component group with aggregated dot
  if (item.type === 'component' && componentDotColor) {
    return (
      <TopRow>
        <StoryName>{item.name}</StoryName>
        <StatusDot color={componentDotColor} />
      </TopRow>
    );
  }

  // Story with review info
  if (item.type === 'story' && (isCapturing || reviewInfo)) {
    const display = reviewInfo
      ? getReviewStateDisplay(reviewInfo.reviewState, reviewInfo.reviewStateReason)
      : null;
    const diffText = reviewInfo ? formatDiffPercent(reviewInfo.diffRatio) : '';
    const dotColor = display ? getDotColor(display.color) : null;
    const showReview = display && !isCapturing;

    // Diff ratio is red when snapshot is not approved
    const isApproved = reviewInfo?.reviewState === 'approved';
    const diffColor = (!isApproved && diffText) ? '#EF4444' : undefined;

    return (
      <LabelWrapper>
        <TopRow>
          <StoryName>{item.name}</StoryName>
          {isCapturing && <Spinner title="Capturing snapshot..." />}
          {!isCapturing && display?.color === 'error' && <ErrorIcon title={display.label}>!</ErrorIcon>}
          {!isCapturing && dotColor && display?.color !== 'error' && <StatusDot color={dotColor} title={display.label} />}
        </TopRow>
        {showReview && (
          <Subtitle>
            {diffText && <DiffText color={diffColor}>{diffText}</DiffText>}
            {diffText && display.label && ' \u00B7 '}
            {display.label}
          </Subtitle>
        )}
      </LabelWrapper>
    );
  }

  // Default: plain label
  return <span>{item.name}</span>;
}
