import getStories from '../getStories';
// import { storiesKey } from '../constants';

let originalTimeout = 0;

beforeEach(function() {
  originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 12000;
});

afterEach(function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
});

it('raises an error when no stories loaded', async () => {
  try {
    await getStories({ iframePath: '.' });
  } catch (e) {
    const message =
      'Evaluation failed: Error: Stories not found on window within 10 seconds. ' +
      "Check your call to serializeStories in your Storybook's config.js.";
    expect(e.message.startsWith(message)).toEqual(true);
  }

  expect.assertions(1);
});

// Need to rethink this one
// it('returns the value window[storiesKey] is set to', async () => {
//   const stories = await getStories({ buildDir: './' });
//   expect(stories).toEqual('hi');
// });
