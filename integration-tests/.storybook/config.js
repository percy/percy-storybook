import { configure, getStorybook } from '@kadira/storybook';
import inPercy from '@percy-io/in-percy';
import faker from 'faker';

// A warning about timemachine - it overides the current date when it's imported,
// so be sure to call reset() if this isn't desired.
import timemachine from 'timemachine';

// This demonstrates how to run code specifically for Percy's rendering environment
if (inPercy()) {
  // Seed faker so it generates deterministic fake data
  faker.seed(123);
  // Use timemachine to freeze the date to 2015
  timemachine.config({
    dateString: 'October 21, 2015 04:19:00'
  });
} else {
  timemachine.reset(); // When we're not in Percy, don't override the current date.
}

function loadStories() {
  require('../stories/index.js');
  // You can require as many stories as you need.
}

configure(loadStories, module);

if (typeof window === 'object') window.__storybook_stories__ = getStorybook();
