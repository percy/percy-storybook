import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useChannel } from 'storybook/manager-api';
import { usePercyProjects, formatRelativeTime } from '../hooks/usePercyProjects.js';
import { PERCY_EVENTS } from '../constants.js';
import {
  MdOutlineSearch, MdClose, MdAdd, MdArrowForward, MdRefresh, MdOutlineInfo
} from '@browserstack/design-stack-icons';
import {
  Container, Title, Subtitle, SearchRow, SearchInputWrapper, SearchInput,
  ClearButton, GoButton, ResultsList, ResultItem, ProjectName, ProjectMeta,
  Divider, CreateButton, EmptyState, EmptyTitle, EmptyDesc, CreateLink,
  LoadingRow
} from './ProjectSetup.styles.js';

/* ─── Spinner styles ───────────────────────────────────────────────────── */

const spinnerStyle = { animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: 6 };
const spinnerWhiteStyle = { animation: 'spin 1s linear infinite' };

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ProjectSetup({ username, accessKey, initialSearch, onProjectConfirmed }) {
  const {
    projects, loading, initialLoading, hasMore, error, search, setSearch, loadMore, cancel
  } = usePercyProjects(username, accessKey, initialSearch);

  const [selectedProject, setSelectedProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const listRef = useRef(null);
  const observerRef = useRef(null);
  const selectedProjectRef = useRef(null);
  const onProjectConfirmedRef = useRef(onProjectConfirmed);

  // Keep refs in sync so the channel callback always has current values
  useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);
  useEffect(() => { onProjectConfirmedRef.current = onProjectConfirmed; }, [onProjectConfirmed]);

  // Channel for server communication
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

  // Stable sentinel callback using refs to avoid observer recreation
  const sentinelCallback = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current) loadMore();
    }, { root: listRef.current, threshold: 0.1 });
    observerRef.current.observe(node);
  }, [loadMore]);

  // Refs for observer callback stability
  const loadingRef = useRef(loading);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSearch(project.name);
    setSaveError('');
    cancel(); // Kill in-flight searches and debounce
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    if (selectedProject) {
      setSelectedProject(null); // Clear selection when user edits
    }
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
      projectName: selectedProject.name
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
        <GoButton
          onClick={handleConfirm}
          disabled={!selectedProject || saving}
          aria-label="Confirm project selection"
        >
          {saving ? <MdRefresh style={{ width: 18, height: 18, color: '#fff', ...spinnerWhiteStyle }} /> : <MdArrowForward style={{ width: 18, height: 18 }} />}
        </GoButton>
      </SearchRow>

      {saveError && (
        <LoadingRow style={{ color: '#dc2626', marginTop: 8 }}>{saveError}</LoadingRow>
      )}

      {showResults && (
        <ResultsList ref={listRef}>
          {(initialLoading || (loading && projects.length === 0)) && (
            <LoadingRow>
              <MdRefresh style={{ width: 16, height: 16, color: '#6b7280', ...spinnerStyle }} /> Loading projects…
            </LoadingRow>
          )}

          {!initialLoading && !loading && projects.length === 0 && (
            <>
              <EmptyState>
                <MdOutlineInfo style={{ width: 18, height: 18, color: '#9ca3af' }} />
                <div>
                  <EmptyTitle>No result found</EmptyTitle>
                  <EmptyDesc>Try another search or create a new project</EmptyDesc>
                </div>
              </EmptyState>
              <CreateLink onClick={() => console.log('Create new project')}>
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
            <LoadingRow><MdRefresh style={{ width: 16, height: 16, color: '#6b7280', ...spinnerStyle }} /> Loading more…</LoadingRow>
          )}
          {hasMore && !loading && projects.length > 0 && <div ref={sentinelCallback} style={{ height: 1 }} />}
          {error && <LoadingRow style={{ color: '#dc2626' }}>{error}</LoadingRow>}
        </ResultsList>
      )}

      <Divider>OR</Divider>

      <CreateButton onClick={() => console.log('Create new project')}>
        <MdAdd style={{ width: 16, height: 16 }} /> Create new project
      </CreateButton>
    </Container>
  );
}
