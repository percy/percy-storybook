import '@browserstack/design-stack/dist/assets/design-stack.css';

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
