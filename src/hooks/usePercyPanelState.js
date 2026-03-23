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
  TRIGGER_BUILD: 'trigger-build',
  BUILD_PROGRESS: 'build-progress',
  REVIEW: 'review'
};

/**
 * Hook managing the Percy panel's view state machine.
 * All transitions are defined in one place for auditability.
 */
export function usePercyPanelState() {
  const [view, setView] = useState(VIEWS.INITIALIZING);
  const [credentials, setCredentials] = useState({ username: '', accessKey: '' });
  const [selectedProject, setSelectedProject] = useState(null);
  const [buildMeta, setBuildMeta] = useState(null);

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

      // Build restore (startup with previous build)
      case 'RESTORE_WITH_BUILD':
        // payload: { credentials, project, lastBuild }
        setCredentials(payload.credentials);
        setSelectedProject(payload.project);
        setBuildMeta(payload.lastBuild);
        setView(payload.lastBuild.state === 'finished' ? VIEWS.REVIEW : VIEWS.BUILD_PROGRESS);
        break;

      // Build progress
      case 'BUILD_STARTED':
        setView(VIEWS.BUILD_PROGRESS);
        break;
      case 'BUILD_FINISHED':
        setBuildMeta(payload);
        setView(VIEWS.REVIEW);
        break;

      // Dynamic view switching (reactive — driven by story navigation useEffect)
      case 'SNAPSHOT_MATCHED':
        // Story has a matching snapshot — switch to review, preserve buildMeta
        setView(VIEWS.REVIEW);
        break;
      case 'SNAPSHOT_UNMATCHED':
        // Story has no matching snapshot — switch to trigger, preserve buildMeta
        setView(VIEWS.TRIGGER_BUILD);
        break;

      // Explicit user action — clears buildMeta permanently
      case 'BACK_TO_TRIGGER_BUILD':
        setBuildMeta(null);
        setView(VIEWS.TRIGGER_BUILD);
        break;
      default:
        break;
    }
  }, []);

  return { view, credentials, selectedProject, buildMeta, transition, VIEWS };
}
