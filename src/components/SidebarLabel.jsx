import React, { useEffect, useState } from 'react';
import { styled } from 'storybook/theming';

/* ─── Styles ──────────────────────────────────────────────────────────── */

const LabelWrapper = styled.span`
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

/* ─── Component ───────────────────────────────────────────────────────── */

/**
 * Custom sidebar label renderer for Percy.
 * Shows a spinner next to stories that are currently being snapshotted.
 * Reads snapshot state from window.__PERCY_SNAPSHOT_STATE__.
 */
export function SidebarLabel({ item }) {
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (item.type !== 'story') return;

    const check = () => {
      const state = window.__PERCY_SNAPSHOT_STATE__;
      if (!state?.isRunning) {
        setIsCapturing(false);
        return;
      }
      setIsCapturing(state.storyIds.has(item.id));
    };

    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [item.id, item.type]);

  return (
    <LabelWrapper>
      <StoryName>{item.name}</StoryName>
      {isCapturing && <Spinner title="Capturing snapshot…" />}
    </LabelWrapper>
  );
}
