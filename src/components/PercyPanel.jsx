import React, { useEffect, useRef, useState, useCallback } from 'react';
import { styled } from 'storybook/theming';
import { useChannel, useStorybookApi } from 'storybook/manager-api';
import { PERCY_EVENTS, SNAPSHOT_STATUS } from '../constants.js';
import { usePercyPanelState } from '../hooks/usePercyPanelState.js';
import { getCurrentStory } from '../utils/storybookApi.js';
import { MdOutlineOpenInNew, MdOutlineVpnKey } from '@browserstack/design-stack-icons';
import { BrowserStackConnect } from './BrowserStackConnect';
import { ProjectSetup } from './ProjectSetup';
import { TriggerBuild } from './TriggerBuild';

/* ─── Styled components ─────────────────────────────────────────────────── */

const Wrapper = styled.div`
  display: flex; flex-direction: column; height: 100%;
  overflow: hidden; background: ${p => p.theme.background.app};
`;

const Header = styled.div`
  display: flex; align-items: center; padding: 10px 16px;
  border-bottom: 1px solid ${p => p.theme.appBorderColor};
  background: ${p => p.theme.background.content}; flex-shrink: 0;
`;

const LogoArea = styled.div`
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; color: ${p => p.theme.color.defaultText};
`;

const HeaderActions = styled.div`
  margin-left: auto; display: flex; align-items: center; gap: 8px;
`;

const HeaderButton = styled.button`
  all: unset; display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; font-size: 13px; font-weight: 500;
  color: ${p => p.theme.color.defaultText};
  border: 1px solid ${p => p.theme.appBorderColor}; border-radius: 6px;
  cursor: pointer; background: ${p => p.theme.background.content};
  &:hover { background: ${p => p.theme.background.hoverable}; }
`;

const ScrollBody = styled.div`
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center;
  padding: 40px 24px; box-sizing: border-box;
`;

const Card = styled.div`
  background: ${p => p.theme.background.content};
  border: 1px solid ${p => p.theme.appBorderColor};
  border-radius: 12px; padding: 40px 32px;
  width: 100%; max-width: 600px; box-sizing: border-box;
`;

const LoadingCenter = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: ${p => p.theme.color.mediumdark}; font-size: 14px;
`;

/* ─── Icons ────────────────────────────────────────────────────────────── */

const BrowserStackLogo = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="url(#bs-grad)"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
    <circle cx="16" cy="16" r="3.5" fill="#F5A623"/>
    <defs><radialGradient id="bs-grad" cx="16" cy="16" r="16"><stop stopColor="#FF6F3A"/><stop offset="1" stopColor="#FF9D38"/></radialGradient></defs>
  </svg>
);


/* ─── Component ─────────────────────────────────────────────────────────── */

export function PercyPanel({ active }) {
  const api = useStorybookApi();
  const { view, credentials, selectedProject, transition, VIEWS } = usePercyPanelState();
  const [skipAutoValidate, setSkipAutoValidate] = useState(false);
  const [snapshotStatus, setSnapshotStatus] = useState(SNAPSHOT_STATUS.IDLE);
  const [buildId, setBuildId] = useState('');
  const [buildUrl, setBuildUrl] = useState('');
  const [snapshotError, setSnapshotError] = useState('');
  const [currentStory, setCurrentStory] = useState(null);
  const restoreAttempted = useRef(false);

  const emit = useChannel({
    [PERCY_EVENTS.PROJECT_CONFIG_LOADED]: ({ credentialsValid, project, hasValidToken }) => {
      if (credentialsValid && project && hasValidToken) {
        transition('RESTORE_FULL', {
          credentials: { username: '', accessKey: '' },
          project
        });
      } else if (credentialsValid) {
        transition('RESTORE_CREDS_ONLY', { username: '', accessKey: '' });
      } else {
        transition('RESTORE_NONE');
      }
    },
    [PERCY_EVENTS.SNAPSHOT_STARTED]: () => {
      setSnapshotStatus(SNAPSHOT_STATUS.RUNNING);
      setBuildId('');
      setBuildUrl('');
      setSnapshotError('');
    },
    [PERCY_EVENTS.SNAPSHOT_SUCCESS]: (data) => {
      setSnapshotStatus(SNAPSHOT_STATUS.SUCCESS);
      if (data?.buildId) setBuildId(data.buildId);
      if (data?.buildUrl) setBuildUrl(data.buildUrl);
    },
    [PERCY_EVENTS.SNAPSHOT_ERROR]: (data) => {
      setSnapshotStatus(SNAPSHOT_STATUS.ERROR);
      setSnapshotError(data?.message || 'Snapshot failed');
    }
  });

  // Track current story selection
  useEffect(() => {
    const update = () => setCurrentStory(getCurrentStory(api));
    update();
    const unsub = api.on('storyChanged', update);
    return () => { if (unsub) unsub(); };
  }, [api]);

  // Startup restore: check for existing project config
  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;
    emit(PERCY_EVENTS.LOAD_PROJECT_CONFIG);

    // Timeout fallback — if server never responds, show auth
    const timeout = setTimeout(() => {
      if (view === VIEWS.INITIALIZING) transition('RESTORE_NONE');
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);

  if (!active) return null;

  const handleAuthenticated = (username, accessKey, projectName) => {
    setSkipAutoValidate(false);
    transition('AUTHENTICATED', { username, accessKey, projectName: projectName || '' });
  };

  const handleChangeCredentials = () => {
    setSkipAutoValidate(true);
    transition('CHANGE_CREDENTIALS');
  };

  const handleProjectConfirmed = (project) => {
    transition('PROJECT_CONFIRMED', project);
  };

  const handleChangeProject = () => {
    transition('CHANGE_PROJECT');
  };

  // Initializing state — brief spinner while checking saved config
  if (view === VIEWS.INITIALIZING) {
    return (
      <Wrapper>
        <LoadingCenter>Loading…</LoadingCenter>
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
            <HeaderButton as="a" href="https://www.browserstack.com/docs/percy/integrate/storybook" target="_blank" rel="noopener noreferrer">
              View documentation <MdOutlineOpenInNew style={{ width: 12, height: 12 }} />
            </HeaderButton>
            {view === VIEWS.TRIGGER_BUILD ? (
              <HeaderButton onClick={handleChangeProject}>
                Change project
              </HeaderButton>
            ) : (
              <HeaderButton onClick={handleChangeCredentials}>
                <MdOutlineVpnKey style={{ width: 14, height: 14 }} /> Change credentials
              </HeaderButton>
            )}
          </HeaderActions>
        </Header>
      )}
      <ScrollBody>
        <Card>
          {view === VIEWS.AUTH && (
            <BrowserStackConnect
              onAuthenticated={handleAuthenticated}
              skipAutoValidate={skipAutoValidate}
            />
          )}
          {view === VIEWS.PROJECT_SETUP && (
            <ProjectSetup
              username={credentials.username}
              accessKey={credentials.accessKey}
              initialSearch=""
              onProjectConfirmed={handleProjectConfirmed}
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
