import React, { useState, useRef, useEffect } from 'react';
import { useChannel } from 'storybook/manager-api';
import { Alert, AlertDescription, Button, InputField } from '@browserstack/design-stack';
import { MdArrowBack } from '@browserstack/design-stack-icons';
import { PERCY_EVENTS } from '../constants.js';
import { Container, BackLink, Title, AlertWrapper, FieldWrapper } from './CreateProject.styles.js';

export function CreateProject({ username, accessKey, onProjectCreated, onBack }) {
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProject, setCreatedProject] = useState(null);

  const createdProjectRef = useRef(null);
  const onProjectCreatedRef = useRef(onProjectCreated);

  useEffect(() => { onProjectCreatedRef.current = onProjectCreated; }, [onProjectCreated]);
  useEffect(() => { createdProjectRef.current = createdProject; }, [createdProject]);

  const emit = useChannel({
    [PERCY_EVENTS.PROJECT_CREATED]: ({ project, error: errMsg }) => {
      if (project) {
        // Project created — now save config (write .percy.yml + fetch token)
        setCreatedProject(project);
        createdProjectRef.current = project;
        emit(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
          projectId: project.id,
          projectName: project.name
        });
      } else {
        setError(errMsg || 'Failed to create project. Please try again.');
        setLoading(false);
      }
    },
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

  const handleCreate = () => {
    const name = projectName.trim();
    if (!name || loading) return;
    setLoading(true);
    setError('');
    emit(PERCY_EVENTS.CREATE_PROJECT, { username, accessKey, projectName: name });
  };

  const handleRetry = () => {
    if (!createdProject || loading) return;
    setLoading(true);
    setError('');
    emit(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
      projectId: createdProject.id,
      projectName: createdProject.name
    });
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
