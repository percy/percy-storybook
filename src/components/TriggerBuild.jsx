import React, { useState } from 'react';
import { styled } from 'storybook/theming';
import { PERCY_EVENTS, SNAPSHOT_TYPES, SNAPSHOT_STATUS } from '../constants.js';
import {
  buildCurrentStoryPattern,
  buildCurrentTreePattern,
  getStorybookBaseUrl
} from '../utils/storybookApi.js';
import { MdPlayArrow } from '@browserstack/design-stack-icons';
import {
  Container, ProjectTitle, Description, ScopeSection, ScopeLabel,
  RadioCard, RadioDot, RadioContent, RadioLabel, RadioDesc,
  RunButton
} from './TriggerBuild.styles.js';

/* ─── Scope options mapped to SNAPSHOT_TYPES ────────────────────────────── */

const SCOPE_OPTIONS = [
  { value: SNAPSHOT_TYPES.CURRENT_STORY, label: 'Current story', description: 'Very Fast - Test only the current story' },
  { value: SNAPSHOT_TYPES.CURRENT_TREE, label: 'Run component', description: 'Fast - Test stories in the current component folder' },
  { value: SNAPSHOT_TYPES.FULL, label: 'All stories', description: 'Full Suite - Test all stories in the project' }
];

/* ─── Inline styled helpers ─────────────────────────────────────────────── */

const Spinner = styled.div`
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const StatusBox = styled.div`
  margin-top: 16px; padding: 12px 16px;
  border-radius: 8px; font-size: 13px;
  text-align: left; line-height: 1.5;
  background: ${p =>
    p.variant === 'success' ? '#f0fdf4' :
    p.variant === 'error' ? '#fef2f2' :
    p.variant === 'running' ? '#eff6ff' : p.theme.background.content};
  border: 1px solid ${p =>
    p.variant === 'success' ? '#bbf7d0' :
    p.variant === 'error' ? '#fecaca' :
    p.variant === 'running' ? '#bfdbfe' : p.theme.appBorderColor};
  color: ${p =>
    p.variant === 'success' ? '#166534' :
    p.variant === 'error' ? '#991b1b' :
    p.variant === 'running' ? '#1e40af' : p.theme.color.defaultText};
`;

const BuildLink = styled.a`
  color: #2563eb; text-decoration: none; font-weight: 500;
  &:hover { text-decoration: underline; }
`;


/* ─── Component ─────────────────────────────────────────────────────────── */

export function TriggerBuild({
  projectName, emit, currentStory,
  snapshotStatus, buildId, buildUrl, snapshotError
}) {
  const [scope, setScope] = useState(SNAPSHOT_TYPES.CURRENT_STORY);

  const isRunning = snapshotStatus === SNAPSHOT_STATUS.RUNNING;

  const handleRunTest = () => {
    if (isRunning || !emit) return;

    // Build include patterns based on selected scope
    let include = [];
    switch (scope) {
      case SNAPSHOT_TYPES.CURRENT_STORY:
        if (!currentStory) return;
        include = [buildCurrentStoryPattern(currentStory)];
        break;
      case SNAPSHOT_TYPES.CURRENT_TREE:
        if (!currentStory) return;
        include = [buildCurrentTreePattern(currentStory)];
        break;
      case SNAPSHOT_TYPES.FULL:
        include = []; // empty = all stories
        break;
    }

    console.log('[percy-trigger]', { scope, currentStory, include });

    emit(PERCY_EVENTS.RUN_SNAPSHOT, {
      baseUrl: getStorybookBaseUrl(),
      include,
      exclude: [],
      scope
    });
  };

  const needsStory = scope !== SNAPSHOT_TYPES.FULL;
  const disableRun = isRunning || (needsStory && !currentStory);

  return (
    <Container>
      <ProjectTitle>{projectName}</ProjectTitle>
      <Description>
        Run visual tests to capture snapshots of your stories and detect visual changes
      </Description>

      <ScopeSection>
        <ScopeLabel>Select test scope</ScopeLabel>
        {SCOPE_OPTIONS.map(option => (
          <RadioCard
            key={option.value}
            selected={scope === option.value}
            onClick={() => !isRunning && setScope(option.value)}
          >
            <RadioDot selected={scope === option.value} />
            <RadioContent>
              <RadioLabel>{option.label}</RadioLabel>
              <RadioDesc>
                {option.description}
                {option.value !== SNAPSHOT_TYPES.FULL && currentStory && scope === option.value && (
                  <> — {option.value === SNAPSHOT_TYPES.CURRENT_STORY
                    ? `${currentStory.title}: ${currentStory.name}`
                    : `${currentStory.title}/*`
                  }</>
                )}
              </RadioDesc>
            </RadioContent>
          </RadioCard>
        ))}
      </ScopeSection>

      <RunButton
        onClick={handleRunTest}
        disabled={disableRun}
        style={disableRun ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
      >
        {isRunning ? <Spinner /> : <MdPlayArrow style={{ width: 16, height: 16 }} />}
        {isRunning ? 'Running…' : 'Run visual test'}
      </RunButton>

      {needsStory && !currentStory && (
        <StatusBox variant="error" style={{ marginTop: 12 }}>
          Select a story in the sidebar to use this scope.
        </StatusBox>
      )}

      {snapshotStatus === SNAPSHOT_STATUS.RUNNING && (
        <StatusBox variant="running">
          Capturing snapshots… This may take a few minutes.
        </StatusBox>
      )}

      {snapshotStatus === SNAPSHOT_STATUS.SUCCESS && (
        <StatusBox variant="success">
          Snapshots captured successfully!
          {buildId && <div style={{ marginTop: 4 }}>Build ID: <strong>{buildId}</strong></div>}
          {buildUrl && (
            <div style={{ marginTop: 4 }}>
              <BuildLink href={buildUrl} target="_blank" rel="noopener noreferrer">
                View build on Percy
              </BuildLink>
            </div>
          )}
        </StatusBox>
      )}

      {snapshotStatus === SNAPSHOT_STATUS.ERROR && (
        <StatusBox variant="error">
          {snapshotError || 'An error occurred during snapshot capture.'}
        </StatusBox>
      )}
    </Container>
  );
}
