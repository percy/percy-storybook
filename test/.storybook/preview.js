export const parameters = {
  options: {
    storySort: {
      order: [
        'Snapshot',
        'Skip'
      ]
    }
  },
  percy: {
    // Preview-level filters are project defaults: a global --include/--exclude replaces them,
    // so these stories stay out of no-filter runs but can still be selected by name.
    exclude: [/^Options/, /^Args$/, /^From params$/, /^Parity\//]
  }
};
