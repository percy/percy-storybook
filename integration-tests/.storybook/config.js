import { configure, getStorybook } from '@kadira/storybook';
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

configure(loadStories, module);

if (typeof window === 'object') window.__storybook_stories__ = getStorybook();
