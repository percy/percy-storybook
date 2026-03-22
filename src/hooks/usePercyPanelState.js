import { useState, useCallback } from 'react';

/**
 * View states for the Percy panel.
 * initializing → auth | project-setup | trigger-build
 */
const VIEWS = {
  INITIALIZING: 'initializing',
  AUTH: 'auth',
  PROJECT_SETUP: 'project-setup',
  CREATE_PROJECT: 'create-project',
  TRIGGER_BUILD: 'trigger-build'
};

/**
 * Hook managing the Percy panel's view state machine.
 * All transitions are defined in one place for auditability.
 */
export function usePercyPanelState() {
  const [view, setView] = useState(VIEWS.INITIALIZING);
  const [credentials, setCredentials] = useState({ username: '', accessKey: '' });
  const [selectedProject, setSelectedProject] = useState(null);

  const transition = useCallback((event, payload) => {
    switch (event) {
      // Startup restore results
      case 'RESTORE_FULL':
        setCredentials(payload.credentials);
        setSelectedProject(payload.project);
        setView(VIEWS.TRIGGER_BUILD);
        break;
      case 'RESTORE_CREDS_ONLY':
        setCredentials(payload);
        setView(VIEWS.PROJECT_SETUP);
        break;
      case 'RESTORE_NONE':
        setView(VIEWS.AUTH);
        break;

      // User actions
      case 'AUTHENTICATED':
        setCredentials({ username: payload.username, accessKey: payload.accessKey });
        setView(VIEWS.PROJECT_SETUP);
        break;
      case 'PROJECT_CONFIRMED':
        setSelectedProject(payload);
        setView(VIEWS.TRIGGER_BUILD);
        break;
      case 'CHANGE_PROJECT':
        setView(VIEWS.PROJECT_SETUP);
        break;
      case 'CREATE_NEW_PROJECT':
        setView(VIEWS.CREATE_PROJECT);
        break;
      case 'BACK_TO_PROJECT_SETUP':
        setView(VIEWS.PROJECT_SETUP);
        break;
      case 'PROJECT_CREATED':
        setSelectedProject(payload);
        setView(VIEWS.TRIGGER_BUILD);
        break;
      case 'CHANGE_CREDENTIALS':
        setView(VIEWS.AUTH);
        break;
      default:
        break;
    }
  }, []);

  return { view, credentials, selectedProject, transition, VIEWS };
}
