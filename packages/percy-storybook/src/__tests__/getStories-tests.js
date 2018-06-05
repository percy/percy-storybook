import getStories from '../getStories';

let originalTimeout = 0;

beforeEach(function() {
  originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
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

it('returns the value window[storiesKey] is set to', async () => {
  const stories = await getStories({ iframePath: __dirname + '/iframe.html' });
  expect(stories).toEqual('mock window __storybook_stories__ value');
});
