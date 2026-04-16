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
    exclude: [/^Options/]
  }
};
