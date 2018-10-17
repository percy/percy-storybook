import { configure, addDecorator, getStorybook, setAddon } from '@storybook/ember';
import { withOptions } from '@storybook/addon-options';

addDecorator(
  withOptions({
    hierarchySeparator: /\/|\./,
    hierarchyRootSeparator: /\|/,
  }),
);

function loadStories() {
  require('../stories/index.stories');

  const req = require.context('../stories', true, /\.stories\.js$/);
  req.keys().forEach(filename => req(filename));
}

import createPercyAddon from '@percy-io/percy-storybook';
const { percyAddon, serializeStories } = createPercyAddon();
setAddon(percyAddon);

configure(loadStories, module);

serializeStories(getStorybook);
