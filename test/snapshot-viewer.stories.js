import React, { useState } from 'react';
import { SnapshotViewer } from '@browserstack/snapshot-viewer';

// Sample images — using public placeholder images for demo
const BASELINE_URL =
  'https://percy.io/api/v1/comparisons/web-baseline-demo.png';
const HEAD_URL = 'https://percy.io/api/v1/comparisons/web-head-demo.png';

// For a real demo, replace these with actual screenshot URLs.
// Using colored placeholder divs as fallback since external URLs may not load.

/**
 * Wrapper that provides a fixed-height container for the viewer.
 */
const ViewerContainer = ({ children, height = 600 }) => (
  <div
    style={{
      width: '100%',
      height: `${height}px`,
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fafafa'
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export default {
  title: 'SnapshotViewer',
  component: SnapshotViewer,
  parameters: {
    percy: { skip: true } // Don't snapshot the viewer itself
  }
};

/**
 * Side-by-side comparison with no images (shows baseline states).
 */
export const SideBySideNewSnapshot = () => (
  <ViewerContainer>
    <SnapshotViewer
      headUrl="https://picsum.photos/seed/head/1280/800"
      naturalWidth={1280}
      naturalHeight={800}
      baselineState="new"
      viewMode="side-by-side"
      headBranch="feature/login-redesign"
      baseBranch="main"
      loading={false}
    />
  </ViewerContainer>
);

SideBySideNewSnapshot.storyName = 'Side-by-Side: New Snapshot';

/**
 * Side-by-side comparison with baseline and head.
 */
export const SideBySideCompared = () => (
  <ViewerContainer>
    <SnapshotViewer
      baselineUrl="https://picsum.photos/seed/baseline/1280/800"
      headUrl="https://picsum.photos/seed/head2/1280/800"
      naturalWidth={1280}
      naturalHeight={800}
      baselineState="compared"
      viewMode="side-by-side"
      headBranch="feature/login-redesign"
      baseBranch="main"
      loading={false}
    />
  </ViewerContainer>
);

SideBySideCompared.storyName = 'Side-by-Side: Compared';

/**
 * Side-by-side with no visual changes.
 */
export const SideBySideNoChanges = () => (
  <ViewerContainer>
    <SnapshotViewer
      baselineUrl="https://picsum.photos/seed/same/1280/800"
      headUrl="https://picsum.photos/seed/same/1280/800"
      naturalWidth={1280}
      naturalHeight={800}
      baselineState="compared"
      hasNoVisualChanges
      viewMode="side-by-side"
      headBranch="feature/minor-fix"
      baseBranch="main"
      loading={false}
    />
  </ViewerContainer>
);

SideBySideNoChanges.storyName = 'Side-by-Side: No Visual Changes';

/**
 * Overlay mode — head view.
 */
export const OverlayHead = () => (
  <ViewerContainer>
    <SnapshotViewer
      baselineUrl="https://picsum.photos/seed/baseline/1280/800"
      headUrl="https://picsum.photos/seed/head2/1280/800"
      naturalWidth={1280}
      naturalHeight={800}
      baselineState="compared"
      viewMode="overlay-head"
      headBranch="feature/login-redesign"
      baseBranch="main"
      loading={false}
    />
  </ViewerContainer>
);

OverlayHead.storyName = 'Overlay: Head View';

/**
 * Overlay mode — baseline view.
 */
export const OverlayBaseline = () => (
  <ViewerContainer>
    <SnapshotViewer
      baselineUrl="https://picsum.photos/seed/baseline/1280/800"
      headUrl="https://picsum.photos/seed/head2/1280/800"
      naturalWidth={1280}
      naturalHeight={800}
      baselineState="compared"
      viewMode="overlay-baseline"
      headBranch="feature/login-redesign"
      baseBranch="main"
      loading={false}
    />
  </ViewerContainer>
);

OverlayBaseline.storyName = 'Overlay: Baseline View';

/**
 * With diff overlay enabled.
 */
export const WithDiffOverlay = () => (
  <ViewerContainer>
    <SnapshotViewer
      baselineUrl="https://picsum.photos/seed/baseline/1280/800"
      headUrl="https://picsum.photos/seed/head2/1280/800"
      naturalWidth={1280}
      naturalHeight={800}
      baselineState="compared"
      viewMode="side-by-side"
      headBranch="feature/login-redesign"
      baseBranch="main"
      diffImage={{
        url: 'https://picsum.photos/seed/diff/1280/800',
        type: 'regular',
        isAvailable: true
      }}
      loading={false}
    />
  </ViewerContainer>
);

WithDiffOverlay.storyName = 'Side-by-Side: With Diff Image';

/**
 * Loading state.
 */
export const Loading = () => (
  <ViewerContainer>
    <SnapshotViewer
      headUrl="https://picsum.photos/seed/head/1280/800"
      naturalWidth={1280}
      naturalHeight={800}
      viewMode="side-by-side"
      loading
    />
  </ViewerContainer>
);

Loading.storyName = 'Loading State';

/**
 * Interactive demo — toggle between view modes.
 */
export const InteractiveViewModes = () => {
  const [viewMode, setViewMode] = useState('side-by-side');

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        {['side-by-side', 'overlay-head', 'overlay-baseline'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #ccc',
              background: viewMode === mode ? '#6366f1' : '#fff',
              color: viewMode === mode ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            {mode}
          </button>
        ))}
      </div>
      <ViewerContainer height={500}>
        <SnapshotViewer
          baselineUrl="https://picsum.photos/seed/baseline/1280/800"
          headUrl="https://picsum.photos/seed/head2/1280/800"
          naturalWidth={1280}
          naturalHeight={800}
          baselineState="compared"
          viewMode={viewMode}
          headBranch="feature/login-redesign"
          baseBranch="main"
          loading={false}
        />
      </ViewerContainer>
    </div>
  );
};

InteractiveViewModes.storyName = 'Interactive: View Mode Switcher';
