import { configure, getStorybook, setAddon } from '@storybook/react';
import { setOptions } from '@storybook/addon-options';
import infoAddon, { setDefaults } from '@storybook/addon-info';

import inPercy from '@percy-io/in-percy';
import faker from 'faker';
import mockdate from 'mockdate';

// This demonstrates how to run code specifically for Percy's rendering environment
if (inPercy()) {
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

configure(loadStories, module);

if (typeof window === 'object') window.__storybook_stories__ = getStorybook();

setOptions({
  name: 'Shared Components',
  url: '',
  goFullScreen: false,
  showLeftPanel: true,
  showDownPanel: true,
  showSearchBox: false,
  downPanelInRight: true,
  sortStoriesByKind: false,
});
