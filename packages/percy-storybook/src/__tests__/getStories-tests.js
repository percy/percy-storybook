import getStories from '../getStories';
import { storiesKey } from '../constants';

let originalTimeout = 0;

beforeEach(function() {
  originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 12000;
});

afterEach(function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
});

it('raises an error when called with an empty object', async () => {
  try {
    await getStories();
  } catch (e) {
    expect(e).toEqual(new Error('Static javascript files could not be located in iframe.html.'));
  }

  expect.assertions(1);
});

it('raises an error when called without JS filepaths', async () => {
  try {
    await getStories({ preview: '<html></html>' });
  } catch (e) {
    expect(e).toEqual(new Error('Static javascript files could not be located in iframe.html.'));
  }

  expect.assertions(1);
});

it('raises an error when asset for JS filepath not found', async () => {
  try {
    await getStories({ preview: '<html></html>' }, ['preview', 'other-preview.js']);
  } catch (e) {
    expect(e).toEqual(new Error('Javascript file not found for: other-preview.js'));
  }

  expect.assertions(1);
});

it('returns an empty array when no stories loaded', async () => {
  const assets = { preview: '<html></html>' };

  try {
    await getStories(assets, ['preview']);
  } catch (e) {
    const message =
      'Storybook object not found on window. ' +
      "Check your call to serializeStories in your Storybook's config.js.";
    expect(e).toEqual(new Error(message));
  }

  expect.assertions(1);
});

it('returns the value window[storiesKey] is set to', async () => {
  const code = `if (typeof window === 'object') window['${storiesKey}'] = 'hi';`;

  const stories = await getStories({ preview: code }, ['preview']);
  expect(stories).toEqual('hi');
});
