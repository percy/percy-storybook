# Releasing

1. `git pull origin master`
1. `yarn test`
1. `yarn lerna:publish` - this will prompt for new versions of all packages that have changed, update the package.json files, will publish the non-private packages to npm, and will create git tags and push them to GitHub.
1. [Update the release notes](https://github.com/percy/percy-storybook/releases) on GitHub for the @percy/storybook vx.x.x tags
1. [Visit npm](https://www.npmjs.com/package/@percy/storybook) and see the new version is live
1. Announce the new release,
   making sure to say "thank you" to the contributors
   who helped shape this version!
