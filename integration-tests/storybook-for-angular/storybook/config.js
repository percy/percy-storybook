import { configure, getStorybook, setAddon } from '@storybook/angular';

function loadStories() {
  require('../src/stories/index.ts');
}

import createPercyAddon from '@percy-io/percy-storybook';
const { percyAddon, serializeStories } = createPercyAddon();
setAddon(percyAddon);

configure(loadStories, module);

serializeStories(getStorybook);
