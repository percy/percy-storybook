import React from 'react';
import { Button, LoaderV2 } from '@browserstack/design-stack';
import { MdOutlineOpenInNew, MdOutlineVpnKey } from '@browserstack/design-stack-icons';
import DSIBStack from '@browserstack/design-stack-icons/dist/DSIBStack';
import { usePercyPanelState } from '../hooks/usePercyPanelState.js';
import { useSnapshotChannel } from '../hooks/useSnapshotChannel.js';
import { BrowserStackConnect } from './BrowserStackConnect';
import { ProjectSetup } from './ProjectSetup';
import { TriggerBuild } from './TriggerBuild';
import { CreateProject } from './CreateProject';
import { Wrapper, Header, LogoArea, HeaderActions, ScrollBody, Card } from './PercyPanel.styles.js';

export function PercyPanel({ active }) {
  const { view, credentials, selectedProject, transition, VIEWS } = usePercyPanelState();
  const { emit, snapshotStatus, buildId, buildUrl, snapshotError, currentStory } =
    useSnapshotChannel(transition, view, VIEWS);

  if (!active) return null;

  const handleAuthenticated = (username, accessKey) => {
    transition('AUTHENTICATED', { username, accessKey });
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
            />
          )}
        </Card>
      </ScrollBody>
    </Wrapper>
  );
}
