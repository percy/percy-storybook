import React, { useState } from 'react';
import {
  Button, RadioGroup, RadioItem
} from '@browserstack/design-stack';
import { MdPlayArrow } from '@browserstack/design-stack-icons';
import { useStorybookApi } from 'storybook/manager-api';
import { PERCY_EVENTS, SNAPSHOT_TYPES, SNAPSHOT_STATUS } from '../constants.js';
import {
  buildCurrentStoryPattern,
  buildCurrentTreePattern,
  getStorybookBaseUrl,
  resolveStoryIdsForScope
} from '../utils/storybookApi.js';
import { Container, ProjectTitle, Description } from './TriggerBuild.styles.js';
import { PreviousBuildDialog } from './PreviousBuildDialog';

/* ─── Scope options mapped to SNAPSHOT_TYPES ────────────────────────────── */

const BASE_SCOPE_OPTIONS = [
  { value: SNAPSHOT_TYPES.CURRENT_STORY, label: 'Current story', baseDesc: 'Very Fast - Test only the current story' },
  { value: SNAPSHOT_TYPES.CURRENT_TREE, label: 'Run component', baseDesc: 'Fast - Test stories in the current component folder' },
  { value: SNAPSHOT_TYPES.FULL, label: 'All stories', baseDesc: 'Full Suite - Test all stories in the project' }
];

/* ─── Component ─────────────────────────────────────────────────────────── */

export function TriggerBuild({
  projectName, emit, currentStory,
  snapshotStatus, buildId, buildUrl, snapshotError, onScopeChange,
  hasPreviousBuild
}) {
  const api = useStorybookApi();
  const [scope, setScope] = useState(SNAPSHOT_TYPES.CURRENT_STORY);
  const [showDialog, setShowDialog] = useState(false);

  const isRunning = snapshotStatus === SNAPSHOT_STATUS.RUNNING;

  const handleRunClick = () => {
    if (isRunning || !emit) return;
    if (hasPreviousBuild) {
      setShowDialog(true);
      return;
    }
    executeRun();
  };

  const executeRun = () => {
    setShowDialog(false);

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

    // Set global snapshot state so SidebarLabel can show spinners
    const storyIds = resolveStoryIdsForScope(api, scope, currentStory);
    window.__PERCY_SNAPSHOT_STATE__ = { isRunning: true, storyIds };

    // Set scope label for BuildProgress story info row
    if (onScopeChange) {
      if (scope === SNAPSHOT_TYPES.CURRENT_STORY && currentStory) {
        onScopeChange(`${currentStory.title}/${currentStory.name}`);
      } else if (scope === SNAPSHOT_TYPES.CURRENT_TREE && currentStory) {
        onScopeChange(`${currentStory.title}/*`);
      } else {
        onScopeChange('All stories');
      }
    }

    console.log('[percy-trigger]', { scope, currentStory, include, storyIdsCount: storyIds.size });

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
        onClick={handleRunClick}
        disabled={disableRun}
        loading={isRunning}
        loaderText="Running…"
        icon={!isRunning ? <MdPlayArrow /> : undefined}
        size="large"
      >
        Run visual test
      </Button>

      {needsStory && !currentStory && (
        <div className="mt-3 p-3 rounded-md bg-danger-weaker text-danger-default text-sm">
          Select a story in the sidebar to use this scope.
        </div>
      )}

      {snapshotStatus === SNAPSHOT_STATUS.RUNNING && (
        <div className="mt-4 p-3 rounded-md bg-brand-weaker text-brand-default text-sm">
          Capturing snapshots… This may take a few minutes.
        </div>
      )}

      {/* SUCCESS state is handled by BuildProgress view */}

      {snapshotStatus === SNAPSHOT_STATUS.ERROR && (
        <div className="mt-4 p-3 rounded-md bg-danger-weaker text-danger-default text-sm">
          {snapshotError || 'An error occurred during snapshot capture.'}
        </div>
      )}
      <PreviousBuildDialog
        isOpen={showDialog}
        onCancel={() => setShowDialog(false)}
        onContinue={executeRun}
        isLoading={isRunning}
      />
    </Container>
  );
}
