import React, { useState } from 'react';
import { styled } from 'storybook/theming';
import { Command } from '@browserstack/design-stack';

// REWRITTEN: uses base Command (not Command.Dialog) to avoid portal/CSS issues

/* ─── Styled components ─────────────────────────────────────────────────── */

const Container = styled.div`
  width: 100%;
  max-width: 640px;
`;

const Title = styled.h2`
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  color: ${p => p.theme.color.defaultText};
`;

const Subtitle = styled.p`
  margin: 0 0 28px;
  font-size: 14px;
  text-align: center;
  color: ${p => p.theme.color.mediumdark};
  line-height: 1.5;
`;

/*
  SearchRow — flex row placing CommandRoot and GoButton side-by-side.
  align-items: flex-start keeps GoButton at the top edge even when
  the results list expands below.
*/
const SearchRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

/*
  CommandRoot — styled(Command) renders inline as a normal div, NO portal.
  Because the cmdk elements are real DOM descendants we can target them
  with plain CSS descendant selectors — no global styles, no !important hacks.
*/
const CommandRoot = styled(Command)`
  flex: 1;
  min-width: 0; /* prevent flex overflow */

  /* ── Search bar pill ── */
  [cmdk-input-wrapper] {
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 12px;
    border: 1px solid ${p => p.theme.appBorderColor};
    border-radius: 8px;
    background: ${p => p.theme.background.content};
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
    gap: 8px;
  }

  /* Reset the <input> itself — flex:1 makes it fill all available space,
     pushing the clear button to the far right end */
  [cmdk-input] {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: ${p => p.theme.color.defaultText};
    &::placeholder {
      color: ${p => p.theme.color.mediumdark};
    }
  }

  /* Clear (×) button — cmdk renders this as a plain <button> inside the
     input wrapper. Reset all browser defaults (border-box outline, padding,
     background) and pin it to the right with margin-left: auto so it always
     sits at the far edge regardless of input content length. */
  [cmdk-input-wrapper] button {
    margin-left: auto;
    flex-shrink: 0;
    border: none;
    background: transparent;
    outline: none;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${p => p.theme.color.mediumdark};
    &:hover {
      color: ${p => p.theme.color.defaultText};
      background: ${p => p.theme.background.hoverable};
    }
  }

  /* ── Results card below the pill ── */
  [cmdk-list] {
    margin-top: 8px;
    border: 1px solid ${p => p.theme.appBorderColor};
    border-radius: 8px;
    background: ${p => p.theme.background.content};
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
    overflow: hidden;
    max-height: 380px;
    overflow-y: auto;
  }

  /* ── Individual result row ── */
  [cmdk-item] {
    padding: 10px 16px;
    cursor: pointer;
    border-bottom: 1px solid ${p => p.theme.appBorderColor};
    &:last-child {
      border-bottom: none;
    }
    &[aria-selected='true'],
    &:hover {
      background: ${p => p.theme.background.hoverable};
    }
  }

  /* No group heading text needed */
  [cmdk-group-heading] {
    display: none;
  }
`;

/*
  GoButton — blue arrow CTA aligned flush with the 48px input pill.
*/
const GoButton = styled.button`
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: #4f6ef2;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
  &:hover { background: #3d5ce0; }
  &:active { background: #2e4dcc; }
`;

const CreateProjectOption = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  &:hover {
    background: ${p => p.theme.background.hoverable};
  }
`;

const CreateProjectLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.color.defaultText};
`;

const EmptyState = styled.div`
  padding: 20px;
  text-align: center;
  color: ${p => p.theme.color.defaultText};
`;

const EmptyStateText = styled.p`
  margin: 0 0 12px;
  font-size: 14px;
  color: ${p => p.theme.color.mediumdark};
`;

const MOCK_PROJECTS = [
  { id: '1', name: 'PR-12632 - Ubuntu v2.0', updated: 'Updated 5 mins ago' },
  { id: '2', name: 'PR-12632 - Ubuntu dashboard v1.4', updated: 'Updated 12 mins ago' },
  { id: '3', name: 'PR-13521 - Ubuntu SSO login new', updated: 'Updated 1 day ago' },
  { id: '4', name: 'PR-12632 - Ubuntu checkout revamp', updated: 'Updated 2 days ago' },
  { id: '5', name: 'PR-13521 - Ubuntu v1.9', updated: 'Updated 4 days ago' },
  { id: '6', name: 'PR-12632 - Ubuntu v1.7', updated: 'Updated 12 days ago' }
];

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ProjectSetup() {
  const [search, setSearch] = useState('');

  const filteredProjects = MOCK_PROJECTS.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container>
      <Title>Project setup</Title>
      <Subtitle>Search an existing project or create a new</Subtitle>

      <SearchRow>
        <CommandRoot label="Project Search">
          <Command.Input
            placeholder="Search across all projects (Search specific items via /)"
            value={search}
            autoFocus
            onValueChange={(val) => {
              if (typeof val === 'string') {
                setSearch(val);
              } else if (val && typeof val.value === 'string') {
                setSearch(val.value);
              }
            }}
          />
          <Command.List>
            <Command.Empty>
              <EmptyState>
                <EmptyStateText>
                  No result found <br />
                  Try another search or create a new project
                </EmptyStateText>
                <CreateProjectOption role="button">
                  <CreateProjectLabel>Create new project</CreateProjectLabel>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/>
                    <path d="M12 5l7 7-7 7"/>
                  </svg>
                </CreateProjectOption>
              </EmptyState>
            </Command.Empty>
            <Command.Group>
              {filteredProjects.map(project => (
                <Command.Item
                  key={project.id}
                  value={project.name}
                  onSelect={() => console.log('Selected', project.name)}
                >
                  <div style={{ fontWeight: 600 }}>{project.name}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{project.updated}</div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </CommandRoot>

        <GoButton aria-label="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/>
            <path d="M12 5l7 7-7 7"/>
          </svg>
        </GoButton>
      </SearchRow>
    </Container>
  );
}
