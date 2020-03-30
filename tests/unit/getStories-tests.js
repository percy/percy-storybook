import puppeteer from 'puppeteer';
import getStories from '../../src/getStories';

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
    { kind: "this is the story's kind", name: "this is the story's name", parameters: {} }
  ]);
});

it('retries if starting puppeteer fails', async () => {
  let alreadyFailed = false;
  const launchPuppeteer = opts => {
    if (!alreadyFailed) {
      alreadyFailed = true;
      throw new Error('failing on purpose');
    }

    return puppeteer.launch(opts);
  };

  const options = { iframePath: __dirname + '/iframe.html', puppeteerLaunchRetries: 2 };
  await expect(getStories(options, launchPuppeteer)).resolves.toBeTruthy();
  expect(alreadyFailed).toBe(true);
});

it('it fails after puppeteer fails to start too many times', async () => {
  const error = new Error('failing on purpose');
  const launchPuppeteer = () => {
    throw error;
  };

  const options = { iframePath: __dirname + '/iframe.html', puppeteerLaunchRetries: 2 };
  await expect(getStories(options, launchPuppeteer)).rejects.toBe(error);
});
