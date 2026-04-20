/**
 * Maps Percy review state + reason to display label and color.
 *
 * @param {string} state  - review-state from Percy API
 * @param {string} reason - review-state-reason from Percy API
 * @returns {{ label: string, color: string } | null}
 *   color values map to design-stack Badge modifier prop
 *   Returns null only when state is missing/empty
 */
export function getReviewStateDisplay(state, reason) {
  if (!state) return null;

  if (state === 'unreviewed') {
    return { label: 'Unreviewed', color: 'purple' };
  }

  if (state === 'merged') {
    return { label: 'merged', color: 'success' };
  }

  if (state === 'approved') {
    if (reason === 'no_diffs') {
      return { label: 'No changes', color: 'info' };
    }
    if (reason === 'user_approved') {
      return { label: 'Approved', color: 'success' };
    }
    return { label: 'Auto approved', color: 'success' };
  }

  if (state === 'changes_requested') {
    return { label: 'Changes requested', color: 'warn' };
  }

  // Fallback for unexpected states (failed, error, etc.)
  return { label: state.replace(/_/g, ' '), color: 'error' };
}

/**
 * Maps review display color to a CSS dot color for sidebar indicators.
 * Colors match the Figma design:
 *   purple  → unreviewed
 *   warn    → changes requested (yellow/orange)
 *   info    → no changes (light blue)
 *   success → approved (green)
 *   error   → failed (red)
 */
const DOT_COLORS = {
  purple: '#8B5CF6',
  warn: '#F59E0B',
  info: '#60A5FA',
  success: '#22C55E',
  error: '#EF4444'
};

export function getDotColor(displayColor) {
  return DOT_COLORS[displayColor] || null;
}

/**
 * Returns a formatted diff percentage string.
 * @param {number} ratio - diff ratio (0-1)
 * @returns {string} e.g. "5% diff"
 */
export function formatDiffPercent(ratio) {
  if (ratio == null || ratio <= 0) return '';
  const pct = (ratio * 100).toFixed(ratio < 0.01 ? 2 : 0);
  return `${pct}% diff`;
}
