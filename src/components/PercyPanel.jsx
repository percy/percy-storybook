import React, { useState, useEffect } from 'react';
import { Button, LoaderV2 } from '@browserstack/design-stack';
import { MdOutlineOpenInNew, MdOutlineVpnKey } from '@browserstack/design-stack-icons';
import DSIBStack from '@browserstack/design-stack-icons/dist/DSIBStack';
import { usePercyPanelState } from '../hooks/usePercyPanelState.js';
import { useSnapshotChannel } from '../hooks/useSnapshotChannel.js';
import { useBuildItems } from '../hooks/useBuildItems.js';
import { useAutoViewSwitch } from '../hooks/useAutoViewSwitch.js';
import { BrowserStackConnect } from './BrowserStackConnect';
import { ProjectSetup } from './ProjectSetup';
import { TriggerBuild } from './TriggerBuild';
import { CreateProject } from './CreateProject';
import { BuildProgress } from './BuildProgress';
import { ReviewPageLoader } from './ReviewPageLoader';
import { Wrapper, Header, LogoArea, HeaderActions, ScrollBody, Card } from './PercyPanel.styles.js';

export function PercyPanel({ active }) {
  const { view, credentials, selectedProject, buildMeta, transition, VIEWS } = usePercyPanelState();
  const { emit, snapshotStatus, buildId, buildUrl, buildNumber, snapshotError, snapshotScope, setScope, currentStory } =
    useSnapshotChannel(transition, view, VIEWS);

  // Defer build items fetch until the panel has been activated at least once
  const [panelActivated, setPanelActivated] = useState(false);
  useEffect(() => {
    if (active && !panelActivated) setPanelActivated(true);
  }, [active]);

  // Hoist build items to panel level for dynamic view switching
  const hasPreviousBuild = !!(buildMeta?.buildId);
  // Fetch items when: build exists + panel activated + build is finished.
  // Restored builds have state='finished'. Fresh builds from BUILD_FINISHED have no state field
  // (they wouldn't reach here unless they finished), so treat missing state as finished.
  const buildIsFinished = !buildMeta?.state || buildMeta.state === 'finished';
  const shouldFetchItems = hasPreviousBuild && buildIsFinished && panelActivated;
  const { groupedItems, storyIdSet, authToken, loading: itemsLoading, error: itemsError, retry: retryItems, reset: resetItems } =
    useBuildItems(shouldFetchItems ? buildMeta.buildId : null, buildMeta);

  // Dynamic view switching based on story navigation
  useAutoViewSwitch({ currentStory, storyIdSet, itemsLoading, hasPreviousBuild, view, transition, VIEWS });

  if (!active) return null;

  const handleAuthenticated = (username, accessKey) => {
    transition('AUTHENTICATED', { username, accessKey });
  };

  const handleBackToTrigger = () => {
    resetItems();
    transition('BACK_TO_TRIGGER_BUILD');
  };

  if (view === VIEWS.INITIALIZING) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center h-full">
          <LoaderV2 size="medium" showLabel label="Loading…" />
        </div>
      </Wrapper>
    );
  }

  // REVIEW has its own layout
  if (view === VIEWS.REVIEW) {
    return (
      <ReviewPageLoader
        buildId={buildMeta?.buildId || buildId}
        buildNumber={buildMeta?.buildNumber || buildNumber}
        buildMeta={buildMeta}
        webUrl={buildMeta?.webUrl || buildUrl}
        currentStoryId={currentStory?.id}
        currentStory={currentStory}
        groupedItems={groupedItems}
        authToken={authToken}
        itemsLoading={itemsLoading}
        itemsError={itemsError}
        retryItems={retryItems}
        onBack={handleBackToTrigger}
        emit={emit}
        snapshotStatus={snapshotStatus}
      />
    );
  }

  // BUILD_PROGRESS has its own header/layout
  if (view === VIEWS.BUILD_PROGRESS) {
    return (
      <BuildProgress
        buildId={buildMeta?.buildId || buildId}
        buildUrl={buildMeta?.webUrl || buildUrl}
        buildNumber={buildMeta?.buildNumber || buildNumber}
        snapshotScope={snapshotScope}
        onBack={handleBackToTrigger}
        onReviewReady={(data) => transition('BUILD_FINISHED', data)}
      />
    );
  }

  const showHeader = view === VIEWS.PROJECT_SETUP || view === VIEWS.CREATE_PROJECT || view === VIEWS.TRIGGER_BUILD;

  return (
    <Wrapper>
      {showHeader && (
        <Header>
          <LogoArea>
            <DSIBStack className="h-8 w-8" />
            BrowserStack
          </LogoArea>
          <HeaderActions>
            <a href="https://www.browserstack.com/docs/percy/integrate/storybook" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="primary" colors="white" size="small" icon={<MdOutlineOpenInNew />} iconPlacement="end">
                View documentation
              </Button>
            </a>
            {view === VIEWS.TRIGGER_BUILD ? (
              <Button variant="primary" colors="white" size="small" onClick={() => transition('CHANGE_PROJECT')}>
                Change project
              </Button>
            ) : (
              <Button variant="primary" colors="white" size="small" icon={<MdOutlineVpnKey />} onClick={() => transition('CHANGE_CREDENTIALS')}>
                Change credentials
              </Button>
            )}
          </HeaderActions>
        </Header>
      )}
      <ScrollBody>
        <Card>
          {view === VIEWS.AUTH && (
            <BrowserStackConnect
              onAuthenticated={handleAuthenticated}
            />
          )}
          {view === VIEWS.PROJECT_SETUP && (
            <ProjectSetup
              username={credentials.username}
              accessKey={credentials.accessKey}
              initialSearch=""
              onProjectConfirmed={(project) => transition('PROJECT_CONFIRMED', project)}
              onCreateProject={() => transition('CREATE_NEW_PROJECT')}
            />
          )}
          {view === VIEWS.CREATE_PROJECT && (
            <CreateProject
              username={credentials.username}
              accessKey={credentials.accessKey}
              onProjectCreated={(project) => transition('PROJECT_CREATED', project)}
              onBack={() => transition('BACK_TO_PROJECT_SETUP')}
            />
          )}
          {view === VIEWS.TRIGGER_BUILD && (
            <TriggerBuild
              projectName={selectedProject?.name || ''}
              emit={emit}
              currentStory={currentStory}
              snapshotStatus={snapshotStatus}
              buildId={buildId}
              buildUrl={buildUrl}
              snapshotError={snapshotError}
              onScopeChange={setScope}
              hasPreviousBuild={hasPreviousBuild}
            />
          )}
        </Card>
      </ScrollBody>
    </Wrapper>
  );
}
