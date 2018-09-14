# Releasing

1. check that you are using the percy-admin npm account: `npm whoami`
1. If you are not, sign out and sign as percy-admin
1. `git pull origin master`
1. `git checkout -b X.X.X`
1. `yarn test`
1. `yarn lerna:publish` - this will prompt for new versions of all packages that have changed, update the package.json files, will publish the non-private packages to npm, and will create git tags and push them to GitHub.
1. Learna has published the packages to NPM but the branch still needs to be merged into `master`
1. Merge approved branch into `master`
1. [Update the release notes](https://github.com/percy/percy-storybook/releases) on GitHub for the @percy-io/percy-storybook vx.x.x tags
1. [Visit npm](https://www.npmjs.com/package/@percy-io/percy-storybook) and see the new version is live
1. Announce the new release,
   making sure to say "thank you" to the contributors
   who helped shape this version!
