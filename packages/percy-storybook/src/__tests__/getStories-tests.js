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
    await getStories({ iframePath: __dirname + '/iframe-without-stories.html' });
  } catch (e) {
    const message =
      'Evaluation failed: Error: Storybook object not found on window. Open your storybook and check the console for errors.';
    expect(e.message.startsWith(message)).toEqual(true);
  }

  expect.assertions(1);
});

it('returns the stories from the window', async () => {
  const stories = await getStories({ iframePath: __dirname + '/iframe.html' });
  expect(stories).toEqual([
    { kind: "this is the story's kind", name: "this is the story's name", parameters: {} },
  ]);
});
