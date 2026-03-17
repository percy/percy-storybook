import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useChannel } from 'storybook/manager-api';
import { usePercyProjects, formatRelativeTime } from '../hooks/usePercyProjects.js';
import { PERCY_EVENTS } from '../constants.js';
import {
  Container, Title, Subtitle, SearchRow, SearchInputWrapper, SearchInput,
  ClearButton, GoButton, ResultsList, ResultItem, ProjectName, ProjectMeta,
  Divider, CreateButton, EmptyState, EmptyTitle, EmptyDesc, CreateLink,
  LoadingRow
} from './ProjectSetup.styles.js';

/* ─── Icons ────────────────────────────────────────────────────────────── */

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

const SpinnerWhite = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

const EmptyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

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
          <SearchIcon />
          <SearchInput
            placeholder="Search across all projects"
            value={search}
            onChange={handleSearchChange}
            autoFocus
          />
          {search && (
            <ClearButton onClick={handleClearSearch} aria-label="Clear search">
              <ClearIcon />
            </ClearButton>
          )}
        </SearchInputWrapper>
        <GoButton
          onClick={handleConfirm}
          disabled={!selectedProject || saving}
          aria-label="Confirm project selection"
        >
          {saving ? <SpinnerWhite /> : <ArrowIcon />}
        </GoButton>
      </SearchRow>

      {saveError && (
        <LoadingRow style={{ color: '#dc2626', marginTop: 8 }}>{saveError}</LoadingRow>
      )}

      {showResults && (
        <ResultsList ref={listRef}>
          {(initialLoading || (loading && projects.length === 0)) && (
            <LoadingRow>
              <Spinner /> Loading projects…
            </LoadingRow>
          )}

          {!initialLoading && !loading && projects.length === 0 && (
            <>
              <EmptyState>
                <EmptyIcon />
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
            <LoadingRow><Spinner /> Loading more…</LoadingRow>
          )}
          {hasMore && !loading && projects.length > 0 && <div ref={sentinelCallback} style={{ height: 1 }} />}
          {error && <LoadingRow style={{ color: '#dc2626' }}>{error}</LoadingRow>}
        </ResultsList>
      )}

      <Divider>OR</Divider>

      <CreateButton onClick={() => console.log('Create new project')}>
        <PlusIcon /> Create new project
      </CreateButton>
    </Container>
  );
}
