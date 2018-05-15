This repository contains the percy-storybook client in packages/percy-storybook, and integration tests for React, Vue, and Angular in integration-tests.  

After you've installed packages with `yarn`, you can run tests for percy-storybook with `yarn test`, or run the integration tests by changing into the relevant folder, exporting your Percy project and token, and running `yarn storybook:percy`. Unit tests and all 3 integration tests are configured to run in CI.

Storybook itself provides two main functions, `yarn storybook` will start an interactive version of Storybook, and `yarn storybook:build` will process (build) the Storybook javascript and assets, and create a static site with them.



The percy-storybook client follows these steps:
[LucidChart diagram to go here]

- Executes Storybook's build-storybook command, to generate the static site Storybook. This happens externally to percy-storybook, and is explicitly called via the package.json's script specification. It transpiles the app code, the storybook code, and the code that was added in the percy-storybook installation step.  It's important to note that this is transpilation only, and does execute the percy-storybook code itself.
- Inspects the iframe.html file that's built as part of the static storybook, and parses out the javascript files that were created.
- Opens and executes those javascript files in JSDom (currently an older version) to retrieve the list of stories and any additional options that were configured for Percy.  They're fetched from `window.__storybook_stories__`.
- Creates a new build with Percy's API, and uploads the static assets as build assets.
- For each story, creates a snapshot with JS enabled. The iframe.html from the built storybook is used as the DOM snapshot, and the path is created with the specific query parameters needed to render the story.
- The build is finalized, and the build's url on percy.io is logged to the console.



When making changes to percy-storybook, it can be helpful to use the React integration test as a playground:

- First run `yarn link` inside percy-storybook, and `yarn link "@percy-io/percy-storybook"` inside integration-tests/storybook-for-react.
- Make the changes you need to percy-storybook.
- Run `yarn build` from this repo's root folder to transpile your percy-storybook code.
- Run `yarn storybook:percy` from within integration-tests/storybook-for-react to ensure your changes work correctly.
- Remember if you're iterating on the percy-storybook code, you'll want to run `yarn build` EACH TIME before trying to exercise your new changes in the integration tests.
