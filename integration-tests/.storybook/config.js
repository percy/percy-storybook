import { configure, getStorybook } from '@kadira/storybook';

function loadStories() {
  require('../stories/index.js');
  // You can require as many stories as you need.
}

configure(loadStories, module);

if (typeof window === 'object') window.__storybook_stories__ = getStorybook();
