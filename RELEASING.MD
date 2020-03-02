# Releasing

1. `git pull origin master`
1. `yarn test:unit` & make sure the integration tests in CI are passing
1. Update the version number in the `package.json` & commit
1. Create a tag: `git tag vx.x.x`
1. Push it all up to GitHub
1. `npm publish`
1. [Update the release notes](https://github.com/percy/percy-storybook/releases) on GitHub for the @percy/storybook vx.x.x tags
1. [Visit npm](https://www.npmjs.com/package/@percy/storybook) and see the new version is live
1. Announce the new release, making sure to say "thank you" to the contributors
   who helped shape this version!
