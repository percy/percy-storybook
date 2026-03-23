import React from 'react';
import { styled } from 'storybook/theming';
import { MdEditNote } from '@browserstack/design-stack-icons';
import { BUILD_STATES } from '../constants.js';

/* ─── Story info row (matches Figma: story path + status badge) ──────── */

const StoryInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid ${p => p.theme.appBorderColor};
  font-size: 13px;
  color: ${p => p.theme.color.defaultText};
  flex-shrink: 0;
`;

const StoryPath = styled.span`
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ReceivingIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${p => p.theme.color.mediumdark};
  font-size: 12px;
  margin-left: auto;
  flex-shrink: 0;
`;

/* ─── Skeleton animation matching Figma design ────────────────────────── */

const SkeletonCard = styled.div`
  width: 280px;
  border: 1px solid ${p => p.theme.appBorderColor};
  border-radius: 12px;
  padding: 20px;
  background: ${p => p.theme.background.content};
`;

const DashedBox = styled.div`
  border: 1.5px dashed #d1d5db;
  border-radius: 6px;
  background: ${p => p.theme.background.app};
`;

function ProcessingAnimation() {
  return (
    <div className="flex items-center justify-center py-6">
      <SkeletonCard>
        {/* Row 1: wide bar */}
        <DashedBox style={{ width: '65%', height: 24, marginBottom: 12 }} />

        {/* Row 2: two small boxes left + one large box right with image icon */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '0 0 auto' }}>
            <DashedBox style={{ width: 56, height: 28 }} />
            <DashedBox style={{ width: 40, height: 20 }} />
          </div>
          <DashedBox style={{
            flex: 1, minHeight: 64, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
            </svg>
          </DashedBox>
        </div>

        {/* Row 3: small bar */}
        <DashedBox style={{ width: 44, height: 16, marginTop: 12 }} />
      </SkeletonCard>
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────────────── */

export const InProgressBuild = React.memo(function InProgressBuild({
  state,
  totalSnapshots,
  totalComparisons,
  totalComparisonsFinished,
  elapsedTime,
  avgBuildTime,
  buildCountForAverage,
  snapshotScope
}) {
  const isPending = state === BUILD_STATES.PENDING;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Story info row — shows what's being processed */}
      {snapshotScope && (
        <StoryInfoRow>
          <StoryPath>{snapshotScope}</StoryPath>
          <ReceivingIndicator>
            <MdEditNote style={{ width: 16, height: 16 }} />
            {isPending ? 'Receiving' : 'Processing'}
          </ReceivingIndicator>
        </StoryInfoRow>
      )}

      <div className="flex flex-col items-center gap-6 py-4 w-full max-w-md">
        <ProcessingAnimation />

        <h3 className="text-lg font-semibold text-neutral-default text-center">
          {isPending
            ? `${totalSnapshots ?? 0} snapshots received`
            : `Processing visual changes ${totalComparisonsFinished ?? 0}/${totalComparisons ?? 0}`
          }
        </h3>

        <div className="flex items-center gap-2 text-sm text-neutral-weaker">
          <span>
            Total time elapsed: <strong>{elapsedTime}</strong>
          </span>
          {buildCountForAverage >= 10 && avgBuildTime && (
            <>
              <span className="h-1 w-1 rounded-full bg-neutral-strong" />
              <span>
                Avg. build time: <strong>{avgBuildTime}</strong>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
