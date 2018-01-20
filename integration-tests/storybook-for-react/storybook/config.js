import { configure, getStorybook, setAddon } from '@storybook/react';
import { setOptions } from '@storybook/addon-options';
import infoAddon, { setDefaults } from '@storybook/addon-info';
import createPercyAddon from '@percy-io/percy-storybook';

import inPercy from '@percy-io/in-percy';
import faker from 'faker';
import mockdate from 'mockdate';

// This demonstrates how to run code specifically for Percy's rendering environment
if (inPercy() || 1 == 1) {
  // Seed faker so it generates deterministic fake data
  faker.seed(123);
  // Mock the current date
  mockdate.set('October 21, 2015 04:19:00');
}

function loadStories() {
  require('../stories/index.js');
  // You can require as many stories as you need.
}

setDefaults({
  inline: true,
  source: false,
});
setAddon(infoAddon);

const { percyAddon, serializeStories } = createPercyAddon();

// You will only need this if you plan on using addWithPercyOptions
// addWithPercyOptions can be used to set options for individual stories (i.e. custom widths or RTL settings)
setAddon(percyAddon);

configure(loadStories, module);

// NOTE: Place this *BEFORE* any setOptions call
serializeStories(getStorybook);

// NOTE: This call has to come *AFTER* exposing the stories on the window object.
setOptions({
  name: 'Shared Components',
  url: '',
  goFullScreen: false,
  showLeftPanel: true,
  showDownPanel: true,
  showSearchBox: false,
  downPanelInRight: true,
  sortStoriesByKind: false,
  hierarchySeparator: /\./,
});
