import React from 'react';
import { Button, LoaderV2 } from '@browserstack/design-stack';
import { MdOutlineOpenInNew, MdOutlineVpnKey } from '@browserstack/design-stack-icons';
import { usePercyPanelState } from '../hooks/usePercyPanelState.js';
import { useSnapshotChannel } from '../hooks/useSnapshotChannel.js';
import { BrowserStackConnect } from './BrowserStackConnect';
import { ProjectSetup } from './ProjectSetup';
import { TriggerBuild } from './TriggerBuild';
import { Wrapper, Header, LogoArea, HeaderActions, ScrollBody, Card } from './PercyPanel.styles.js';

const BrowserStackLogo = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="url(#bs-grad)"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
    <circle cx="16" cy="16" r="3.5" fill="#F5A623"/>
    <defs><radialGradient id="bs-grad" cx="16" cy="16" r="16"><stop stopColor="#FF6F3A"/><stop offset="1" stopColor="#FF9D38"/></radialGradient></defs>
  </svg>
);

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

  const showHeader = view === VIEWS.PROJECT_SETUP || view === VIEWS.TRIGGER_BUILD;

  return (
    <Wrapper>
      {showHeader && (
        <Header>
          <LogoArea>
            <BrowserStackLogo />
            BrowserStack
          </LogoArea>
          <HeaderActions>
            <a href="https://www.browserstack.com/docs/percy/integrate/storybook" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" colors="white" size="small" icon={<MdOutlineOpenInNew />} iconPlacement="right">
                View documentation
              </Button>
            </a>
            {view === VIEWS.TRIGGER_BUILD ? (
              <Button variant="secondary" colors="white" size="small" onClick={() => transition('CHANGE_PROJECT')}>
                Change project
              </Button>
            ) : (
              <Button variant="secondary" colors="white" size="small" icon={<MdOutlineVpnKey />} onClick={() => transition('CHANGE_CREDENTIALS')}>
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
