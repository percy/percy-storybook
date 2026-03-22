import React, { useState } from 'react';
import {
  Button, RadioGroup, RadioItem,
  Alert, AlertDescription, AlertLink
} from '@browserstack/design-stack';
import { MdPlayArrow } from '@browserstack/design-stack-icons';
import { PERCY_EVENTS, SNAPSHOT_TYPES, SNAPSHOT_STATUS } from '../constants.js';
import {
  buildCurrentStoryPattern,
  buildCurrentTreePattern,
  getStorybookBaseUrl
} from '../utils/storybookApi.js';
import { Container, ProjectTitle, Description } from './TriggerBuild.styles.js';

/* ─── Scope options mapped to SNAPSHOT_TYPES ────────────────────────────── */

const BASE_SCOPE_OPTIONS = [
  { value: SNAPSHOT_TYPES.CURRENT_STORY, label: 'Current story', baseDesc: 'Very Fast - Test only the current story' },
  { value: SNAPSHOT_TYPES.CURRENT_TREE, label: 'Run component', baseDesc: 'Fast - Test stories in the current component folder' },
  { value: SNAPSHOT_TYPES.FULL, label: 'All stories', baseDesc: 'Full Suite - Test all stories in the project' }
];

/* ─── Component ─────────────────────────────────────────────────────────── */

export function TriggerBuild({
  projectName, emit, currentStory,
  snapshotStatus, buildId, buildUrl, snapshotError
}) {
  const [scope, setScope] = useState(SNAPSHOT_TYPES.CURRENT_STORY);

  const isRunning = snapshotStatus === SNAPSHOT_STATUS.RUNNING;

  const handleRunTest = () => {
    if (isRunning || !emit) return;

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
        include = [];
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

  // Build radio options with dynamic descriptions
  const scopeOptions = BASE_SCOPE_OPTIONS.map(opt => {
    let description = opt.baseDesc;
    if (opt.value !== SNAPSHOT_TYPES.FULL && currentStory && scope === opt.value) {
      const suffix = opt.value === SNAPSHOT_TYPES.CURRENT_STORY
        ? `${currentStory.title}: ${currentStory.name}`
        : `${currentStory.title}/*`;
      description = `${opt.baseDesc} — ${suffix}`;
    }
    return { value: opt.value, label: opt.label, description };
  });

  return (
    <Container>
      <ProjectTitle>{projectName}</ProjectTitle>
      <Description>
        Run visual tests to capture snapshots of your stories and detect visual changes
      </Description>

      <div className="text-left mb-6">
        <div className="text-sm font-semibold text-neutral-default mb-3">Select test scope</div>
        <div className="border border-neutral-default rounded-lg overflow-hidden">
          <RadioGroup
            id="percy-scope"
            value={scope}
            onChange={(val) => !isRunning && setScope(val)}
            columnWrapperClassName="!space-y-0 divide-y divide-neutral-default"
          >
            {scopeOptions.map(option => (
              <RadioItem
                key={option.value}
                option={option}
                withDescription
                disabled={isRunning}
                wrapperClassName={`px-4 py-3 ${scope === option.value ? 'bg-brand-weakest' : ''}`}
              />
            ))}
          </RadioGroup>
        </div>
      </div>

      <Button
        variant="primary"
        colors="brand"
        fullWidth
        onClick={handleRunTest}
        disabled={disableRun}
        loading={isRunning}
        loaderText="Running…"
        icon={!isRunning ? <MdPlayArrow /> : undefined}
        size="large"
      >
        Run visual test
      </Button>

      {needsStory && !currentStory && (
        <div className="mt-3">
          <Alert variant="ERROR" density="compact">
            <AlertDescription>Select a story in the sidebar to use this scope.</AlertDescription>
          </Alert>
        </div>
      )}

      {snapshotStatus === SNAPSHOT_STATUS.RUNNING && (
        <div className="mt-4">
          <Alert variant="INFO">
            <AlertDescription>Capturing snapshots… This may take a few minutes.</AlertDescription>
          </Alert>
        </div>
      )}

      {snapshotStatus === SNAPSHOT_STATUS.SUCCESS && (
        <div className="mt-4">
          <Alert variant="SUCCESS">
            <AlertDescription>
              Snapshots captured successfully!
              {buildId && <div className="mt-1">Build ID: <strong>{buildId}</strong></div>}
            </AlertDescription>
            {buildUrl && (
              <AlertLink href={buildUrl} target="_blank" rel="noopener noreferrer">
                View build on Percy
              </AlertLink>
            )}
          </Alert>
        </div>
      )}

      {snapshotStatus === SNAPSHOT_STATUS.ERROR && (
        <div className="mt-4">
          <Alert variant="ERROR">
            <AlertDescription>
              {snapshotError || 'An error occurred during snapshot capture.'}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </Container>
  );
}
