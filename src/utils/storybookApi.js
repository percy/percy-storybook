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
