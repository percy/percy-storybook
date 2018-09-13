## Overview
This repository contains the percy-storybook client in packages/percy-storybook.  It has supporting integration tests in the form of example Storybooks for React, Vue, and Angular in ./integration-tests.  

## Tests
After you've installed packages with `yarn`, you can:
* run unit tests for percy-storybook with `yarn test`
* run the integration tests by changing into the relevant folder ./integration-tests folder, exporting your Percy token, and running `yarn storybook:percy`.

Unit tests and all 3 integration tests are configured to run in CI on both Travis and Appveyor.

## Storybook commands
Two commands to know about Storybook itself:
* `yarn storybook` will start an interactive version of Storybook that you can visit in your browser.
* `yarn storybook:build` will process (build) the Storybook javascript and assets, and create a static site with them in storybook-static.  

You can switch into one of the integration tests and try either of these commands.


## How percy-storybook works
The percy-storybook client follows these steps:

- The setup instructions propose adding a script to your package.json like this: `"snapshot": "build-storybook && percy-storybook"`.  You then use percy-storybook with `npm run snapshot`.
- This first executes Storybook's `build-storybook` command, to generate the static site Storybook.  It transpiles the app code, the storybook code, and the code that was added in the percy-storybook installation step.  It's important to note that this is transpilation only, and does execute the percy-storybook code itself.
- The `percy-storybook` command is then executed, which invokes the `run` function in `./packages/percy-storybook/cli.js`, which in turn:
    1. Opens and executes the built storybook with puppeteer to retrieve the list of stories and any additional options that were configured for Percy.  The list of stories is fetched from `window.__storybook_stories__`.
    1. Creates a new build with Percy's API, and uploads the static storybook assets as build assets.
    1. For each story, creates a snapshot with JS enabled. The iframe.html from the built storybook is used as the DOM snapshot, and the path is created with the specific query parameters needed to render the story.
    1. The build is finalized, and the build's url on percy.io is logged to the console.


## Development
When making changes to percy-storybook, it can be helpful to use the React integration test as a playground:

- First run `yarn link` inside ./packages/percy-storybook, and `yarn link "@percy-io/percy-storybook"` inside ./integration-tests/storybook-for-react.
- Make the changes you need to percy-storybook.
- Run `yarn build` from this repo's root folder to transpile your percy-storybook code.
- Run `yarn storybook:percy` from within integration-tests/storybook-for-react to ensure your changes work correctly.
- Remember if you're iterating on the percy-storybook code, you'll want to run `yarn build` *EACH TIME* before trying to exercise your new changes in the integration tests.
