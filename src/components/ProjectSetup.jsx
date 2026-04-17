import React, { useState, useRef, useEffect } from 'react';
import { useChannel } from 'storybook/manager-api';
import { Button, Alert, AlertDescription, LoaderV2 } from '@browserstack/design-stack';
import {
  MdOutlineSearch, MdClose, MdAdd, MdArrowForward, MdOutlineInfo
} from '@browserstack/design-stack-icons';
import { usePercyProjects, formatRelativeTime } from '../hooks/usePercyProjects.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import { PERCY_EVENTS } from '../constants.js';
import {
  Container, Title, Subtitle, SearchRow, SearchInputWrapper, SearchInput,
  ClearButton, ResultsList, ResultItem, ProjectName, ProjectMeta,
  Divider, CreateLink, LoadingRow
} from './ProjectSetup.styles.js';

export function ProjectSetup({ username, accessKey, initialSearch, onProjectConfirmed, onCreateProject }) {
  const {
    projects, loading, initialLoading, hasMore, error, search, setSearch, loadMore, cancel
  } = usePercyProjects(username, accessKey, initialSearch);

  const [selectedProject, setSelectedProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { listRef, sentinelRef } = useInfiniteScroll(loadMore, loading);

  const selectedProjectRef = useRef(null);
  const onProjectConfirmedRef = useRef(onProjectConfirmed);
  useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);
  useEffect(() => { onProjectConfirmedRef.current = onProjectConfirmed; }, [onProjectConfirmed]);

  const emit = useChannel({
    [PERCY_EVENTS.PROJECT_CONFIG_SAVED]: ({ success, error: errMsg }) => {
      setSaving(false);
      if (success) {
        const project = selectedProjectRef.current;
        if (onProjectConfirmedRef.current && project) {
          onProjectConfirmedRef.current(project);
        }
      } else {
        setSaveError(errMsg || 'Failed to save project configuration');
      }
    }
  });

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSearch(project.name);
    setSaveError('');
    cancel();
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    if (selectedProject) setSelectedProject(null);
    setSaveError('');
  };

  const handleClearSearch = () => {
    setSearch('');
    setSelectedProject(null);
    setSaveError('');
  };

  const handleConfirm = () => {
    if (!selectedProject || saving) return;
    setSaving(true);
    setSaveError('');
    emit(PERCY_EVENTS.SAVE_PROJECT_CONFIG, {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      username,
      accessKey
    });
  };

  const showResults = !selectedProject && (search || projects.length > 0 || loading);

  return (
    <Container>
      <Title>Project setup</Title>
      <Subtitle>Search an existing project or create a new</Subtitle>

      <SearchRow>
        <SearchInputWrapper>
          <MdOutlineSearch style={{ width: 16, height: 16, color: '#9ca3af' }} />
          <SearchInput
            placeholder="Search across all projects"
            value={search}
            onChange={handleSearchChange}
            autoFocus
          />
          {search && (
            <ClearButton onClick={handleClearSearch} aria-label="Clear search">
              <MdClose style={{ width: 14, height: 14 }} />
            </ClearButton>
          )}
        </SearchInputWrapper>
        <Button
          variant="primary"
          colors="brand"
          onClick={handleConfirm}
          disabled={!selectedProject || saving}
          loading={saving}
          icon={!saving ? <MdArrowForward /> : undefined}
          isIconOnlyButton
          ariaLabel="Confirm project selection"
          wrapperClassName="h-12 w-12 rounded-lg flex-shrink-0"
        />
      </SearchRow>

      {saveError && (
        <div className="mt-2">
          <Alert variant="error" density="compact">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        </div>
      )}

      {showResults && (
        <ResultsList ref={listRef}>
          {(initialLoading || (loading && projects.length === 0)) && (
            <LoadingRow>
              <LoaderV2 size="small" showLabel label="Loading projects…" />
            </LoadingRow>
          )}

          {!initialLoading && !loading && projects.length === 0 && (
            <>
              <div className="flex items-start gap-2 p-4">
                <MdOutlineInfo style={{ width: 18, height: 18, color: '#9ca3af', flexShrink: 0 }} />
                <div>
                  <div className="font-semibold text-sm">No result found</div>
                  <div className="text-xs text-neutral-500 mt-0.5">Try another search or create a new project</div>
                </div>
              </div>
              <CreateLink onClick={onCreateProject}>
                Create new project →
              </CreateLink>
            </>
          )}

          {projects.map(project => (
            <ResultItem
              key={project.id}
              selected={selectedProject?.id === project.id}
              onClick={() => handleSelectProject(project)}
            >
              <ProjectName>{project.name}</ProjectName>
              <ProjectMeta>{formatRelativeTime(project.updatedAt)}</ProjectMeta>
            </ResultItem>
          ))}

          {loading && !initialLoading && projects.length > 0 && (
            <LoadingRow>
              <LoaderV2 size="small" showLabel label="Loading more…" />
            </LoadingRow>
          )}
          {hasMore && !loading && projects.length > 0 && <div ref={sentinelRef} style={{ height: 1 }} />}
          {error && (
            <div className="px-4 py-3">
              <Alert variant="error" density="compact">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
        </ResultsList>
      )}

      <Divider>OR</Divider>

      <Button
        variant="primary"
        colors="brand"
        fullWidth
        icon={<MdAdd />}
        onClick={onCreateProject}
      >
        Create new project
      </Button>
    </Container>
  );
}
