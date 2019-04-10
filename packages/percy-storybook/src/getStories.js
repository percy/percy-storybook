const os = require('os');
const puppeteer = require('puppeteer');
import { storybookClientAPIKey, storyStoreKey, dataKey } from './constants';

// The function below needs to be in a template string to prevent babel from transforming it.
// If babel transformed it, puppeteer wouldn't be able to evaluate it properly.
// See: https://github.com/GoogleChrome/puppeteer/issues/1665#issuecomment-354241717
// Also see comment below about Debugging page.evaluate
const fetchStoriesFromWindow = `(async () => {
  return await new Promise((resolve, reject) => {
    const storybookClientAPIKey = '${storybookClientAPIKey}';
    const storyStoreKey = '${storyStoreKey}';
    const dataKey = '${dataKey}';
    // Check if the window has stories every 100ms for up to 10 seconds.
    // This allows 10 seconds for any async pre-tasks (like fetch) to complete.
    // Usually stories will be found on the first loop.
    var checkStories = function(timesCalled) {
      if (window[storybookClientAPIKey]) {
        // Found the stories, sanitize to name, kind, and options, and then return them.
        var reducedStories = window[storybookClientAPIKey].raw().map(story => { return {
          name: story.name,
          kind: story.kind,
          parameters: { percy: story.parameters ? story.parameters.percy : undefined },
        }});
        resolve(reducedStories);
      } else if (timesCalled < 100) {
        // Stories not found yet, try again 100ms from now
        setTimeout(() => {
          checkStories(timesCalled + 1);
        }, 100);
      } else {
        reject(new Error(
          'Storybook object not found on window. ' +
          'Open your storybook and check the console for errors.'
        ));
      }
    };
    checkStories(0);
  });
})()`;

export default async function getStories(options = {}) {
  let launchArgs = [];

  // Some CI platforms including Travis requires Chrome to be launched without the sandbox
  // See https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-on-travis-ci
  // See https://docs.travis-ci.com/user/chrome#Sandboxing
  if (os.platform() === 'linux') {
    launchArgs.push('--no-sandbox');
  }

  const browser = await puppeteer.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage();

  await page.goto('file://' + options.iframePath);

  let stories;

  try {
    // Debugging page.evaluate is easier if you:
    // 1: Launch puppeteer with headless: false above
    // 2: Comment out await browser.close() below
    // 3: Add console.log statements inside fetchStoriesFromWindow above.
    stories = await page.evaluate(fetchStoriesFromWindow);
  } finally {
    await browser.close();
  }

  if (!stories) {
    const message =
      'Storybook object not found on window. Open your storybook and check the console for errors.';
    throw new Error(message);
  }

  return stories;
}
