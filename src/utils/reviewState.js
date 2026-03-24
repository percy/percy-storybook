/**
 * Maps Percy review state + reason to display label and color.
 *
 * @param {string} state  - review-state from Percy API
 * @param {string} reason - review-state-reason from Percy API
 * @returns {{ label: string, color: string } | null}
 *   color values map to design-stack Badge modifier prop
 *   Returns null when no badge should be shown (e.g. unreviewed)
 */
export function getReviewStateDisplay(state, reason) {
  if (!state || state === 'unreviewed') return null;

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
 * Returns a formatted diff percentage string.
 * @param {number} ratio - diff ratio (0-1)
 * @returns {string} e.g. "5% diff"
 */
export function formatDiffPercent(ratio) {
  if (ratio == null || ratio <= 0) return '';
  const pct = (ratio * 100).toFixed(ratio < 0.01 ? 2 : 0);
  return `${pct}% diff`;
}
