import React, { useState, useRef, useEffect } from 'react';
import { useChannel } from 'storybook/manager-api';
import { Alert, AlertDescription, Button, InputField } from '@browserstack/design-stack';
import { MdArrowBack } from '@browserstack/design-stack-icons';
import { PERCY_EVENTS } from '../constants.js';
import { Container, BackLink, Title, AlertWrapper, FieldWrapper } from './CreateProject.styles.js';

/**
 * Parse error message from Percy API error response.
 * Format: { errors: [{ status, source?, detail? }] }
 */
function parseApiError(json) {
  if (json?.errors?.length) {
    const detailed = json.errors.find(e => e.detail);
    if (detailed?.detail) return detailed.detail;
  }
  return 'Failed to create project. Please try again.';
}

/**
 * Map HTTP status to user-friendly error message.
 */
function getHttpError(status) {
  if (status === 401) return 'Authentication failed. Please update your credentials.';
  if (status === 403) return 'You don\'t have permission to create projects.';
  if (status === 429) return 'Too many requests. Please try again later.';
  if (status >= 500) return 'Something went wrong. Please try again.';
  return null;
}

export function CreateProject({ username, accessKey, onProjectCreated, onBack }) {
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProject, setCreatedProject] = useState(null);

  const abortRef = useRef(null);
  const createdProjectRef = useRef(null);
  const onProjectCreatedRef = useRef(onProjectCreated);

  useEffect(() => { onProjectCreatedRef.current = onProjectCreated; }, [onProjectCreated]);
  useEffect(() => { createdProjectRef.current = createdProject; }, [createdProject]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const emit = useChannel({
    [PERCY_EVENTS.PROJECT_CONFIG_SAVED]: ({ success, error: errMsg }) => {
      if (success) {
        const project = createdProjectRef.current;
        if (onProjectCreatedRef.current && project) {
          onProjectCreatedRef.current(project);
        }
      } else {
        setLoading(false);
        setError(errMsg || 'Project created but failed to save configuration.');
      }
    }
  });

  const saveProjectConfig = (project) => {
    emit(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
      projectId: project.id,
      projectName: project.name
    });
  };

  const handleCreate = async () => {
    const name = projectName.trim();
    if (!name || loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://percy.io/api/v1/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${accessKey}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: { attributes: { name, type: 'web' } } }),
        signal: controller.signal
      });

      if (!response.ok) {
        const httpError = getHttpError(response.status);
        if (httpError) {
          setError(httpError);
          setLoading(false);
          return;
        }
        const json = await response.json().catch(() => null);
        setError(parseApiError(json));
        setLoading(false);
        return;
      }

      const json = await response.json();
      const project = { id: json.data.id, name: json.data.attributes.name };
      setCreatedProject(project);
      createdProjectRef.current = project;
      saveProjectConfig(project);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (!createdProject || loading) return;
    setLoading(true);
    setError('');
    saveProjectConfig(createdProject);
  };

  const handleChange = (e) => {
    setProjectName(e.target.value);
    if (error) setError('');
    if (createdProject) setCreatedProject(null);
  };

  const isDisabled = !projectName.trim() || loading;

  return (
    <Container>
      <BackLink onClick={onBack} type="button">
        <MdArrowBack style={{ width: 16, height: 16 }} />
        Back to project selection
      </BackLink>

      <Title>Create a new project</Title>

      <AlertWrapper>
        <Alert variant="info">
          <AlertDescription>
            <div>Project will be automatically configured with:</div>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li>Project type: Web</li>
              <li>Browser management: Percy</li>
              <li>Baseline workflow: Git</li>
            </ul>
          </AlertDescription>
        </Alert>
      </AlertWrapper>

      <FieldWrapper>
        <InputField
          id="project-name"
          label="Project Name"
          placeholder="Enter project name"
          value={projectName}
          onChange={handleChange}
          errorText={error && !createdProject ? error : undefined}
        />
      </FieldWrapper>

      {createdProject && error && (
        <div className="mb-4">
          <Alert variant="error">
            <AlertDescription>
              {error}{' '}
              <button
                type="button"
                onClick={handleRetry}
                style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Button
        variant="primary"
        colors="brand"
        fullWidth
        onClick={createdProject && error ? handleRetry : handleCreate}
        disabled={isDisabled}
        loading={loading}
        loaderText="Creating…"
      >
        Create project
      </Button>
    </Container>
  );
}
