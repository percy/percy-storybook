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

/* ─── Animated skeleton matching Figma design ────────────────────────── */

const SkeletonCard = styled.div`
  width: 280px;
  border: 1px solid ${p => p.theme.appBorderColor};
  border-radius: 12px;
  padding: 20px;
  background: ${p => p.theme.background.content};
  position: relative;
  overflow: hidden;

  /* Shimmer overlay that sweeps across the card */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.06) 40%,
      rgba(99, 102, 241, 0.12) 50%,
      rgba(99, 102, 241, 0.06) 60%,
      transparent 100%
    );
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const DashedBox = styled.div`
  border: 1.5px dashed #d1d5db;
  border-radius: 6px;
  background: ${p => p.theme.background.app};
  animation: pulse-fade 1.8s ease-in-out infinite;

  @keyframes pulse-fade {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

/* Dots that travel from left icon to right icon */
const DotTrailWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
`;

const TravelDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ds-color-brand-6, #6366f1);
  animation: dot-travel 1.6s ease-in-out infinite;
  animation-delay: ${p => p.delay || '0s'};

  @keyframes dot-travel {
    0% { opacity: 0.2; transform: scale(0.6); }
    30% { opacity: 1; transform: scale(1); }
    70% { opacity: 1; transform: scale(1); }
    100% { opacity: 0.2; transform: scale(0.6); }
  }
`;

/* Source and destination icons */
const EndpointIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid ${p => p.theme.appBorderColor};
  background: ${p => p.theme.background.content};
  font-size: 16px;
  flex-shrink: 0;
`;

const PercyIcon = styled(EndpointIcon)`
  border-color: var(--ds-color-brand-6, #6366f1);
  color: var(--ds-color-brand-6, #6366f1);
  font-weight: 700;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 10px;
    border: 2px solid var(--ds-color-brand-6, #6366f1);
    opacity: 0;
    animation: pulse-ring 2s ease-out infinite;
  }

  @keyframes pulse-ring {
    0% { opacity: 0.5; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.3); }
  }
`;

function ReceivingAnimation() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: '8px 0' }}>
      <EndpointIcon>&#9776;</EndpointIcon>
      <DotTrailWrapper>
        {[0, 1, 2, 3, 4].map(i => (
          <TravelDot key={i} delay={`${i * 0.25}s`} />
        ))}
      </DotTrailWrapper>
      <PercyIcon>P</PercyIcon>
    </div>
  );
}

function ProcessingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6">
      <ReceivingAnimation />
      <SkeletonCard>
        {/* Row 1: wide bar */}
        <DashedBox style={{ width: '65%', height: 24, marginBottom: 12, animationDelay: '0s' }} />

        {/* Row 2: two small boxes left + one large box right with image icon */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '0 0 auto' }}>
            <DashedBox style={{ width: 56, height: 28, animationDelay: '0.2s' }} />
            <DashedBox style={{ width: 40, height: 20, animationDelay: '0.4s' }} />
          </div>
          <DashedBox style={{
            flex: 1,
            minHeight: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animationDelay: '0.3s'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
            </svg>
          </DashedBox>
        </div>

        {/* Row 3: small bar */}
        <DashedBox style={{ width: 44, height: 16, marginTop: 12, animationDelay: '0.5s' }} />
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
