/**
 * Storybook API helpers for getting current story info and building
 * Percy include/exclude patterns for snapshot scoping.
 */

/**
 * Get the current story metadata from Storybook API.
 * @param {Object} api - Storybook API instance (from useStorybookApi)
 * @returns {Object|null} Story metadata { id, title, name } or null
 */
export function getCurrentStory(api) {
  try {
    const state = api.getUrlState();
    if (!state?.storyId) return null;
    const story = api.getData(state.storyId);
    return story || null;
  } catch {
    return null;
  }
}

/**
 * Build a Percy include pattern that matches a single story.
 * Percy uses "Component Title: Story Name" format.
 * @param {Object} story - Story metadata with { title, name }
 * @returns {string} Include pattern e.g. "Button: Primary"
 */
export function buildCurrentStoryPattern(story) {
  if (!story) return '';
  return `${story.title}: ${story.name}`;
}

/**
 * Build a Percy include pattern that matches all stories under a component.
 * Uses wildcard to match any story name within the component.
 * @param {Object} story - Story metadata with { title }
 * @returns {string} Include pattern e.g. "Button: *"
 */
export function buildCurrentTreePattern(story) {
  if (!story) return '';
  return `${story.title}: *`;
}

/**
 * Get the base URL of the running Storybook instance.
 * @returns {string} Base URL e.g. "http://localhost:6006"
 */
export function getStorybookBaseUrl() {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

/**
 * Resolve a Set of story IDs that fall within a given snapshot scope.
 * Used to mark stories with spinners in the sidebar during snapshot capture.
 * @param {Object} api - Storybook API instance
 * @param {string} scope - One of SNAPSHOT_TYPES (full, current_story, current_tree)
 * @param {Object|null} currentStory - Current story metadata { id, title, name }
 * @returns {Set<string>} Set of story IDs in scope
 */
export function resolveStoryIdsForScope(api, scope, currentStory) {
  const ids = new Set();

  if (scope === 'current_story') {
    if (currentStory?.id) ids.add(currentStory.id);
    return ids;
  }

  // SB8: api.getIndex() returns { v, entries: Record<StoryId, Entry> }
  // Each entry has: { id, type, name, title, ... }
  // type is "story" | "docs" | "component" | "group" | "root"
  try {
    const result = api.getIndex?.();
    const entries = result?.entries || {};

    if (scope === 'full') {
      for (const [id, entry] of Object.entries(entries)) {
        if (entry.type === 'story') ids.add(id);
      }
    } else if (scope === 'current_tree' && currentStory?.title) {
      const prefix = currentStory.title;
      for (const [id, entry] of Object.entries(entries)) {
        if (entry.type === 'story' && entry.title === prefix) {
          ids.add(id);
        }
      }
    }
  } catch {
    // Fallback: if we can't get the index, at least mark the current story
    if (currentStory?.id) ids.add(currentStory.id);
  }

  // If index didn't yield results, fallback to current story
  if (ids.size === 0 && currentStory?.id) {
    ids.add(currentStory.id);
  }

  return ids;
}
