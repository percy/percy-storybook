# Releasing

1. Check that you are using the percy-admin npm account: `npm whoami`
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

If you run into issues and your packages are tagged but not published use these 2 commands to clean up the messy state
  1. `git reset --hard HEAD~1`: delete the version commit that lerna made
  1. `git tag -d $(git log --date-order --tags --simplify-by-decoration --pretty=format:'%d' | head -1 | tr -d '()' | sed 's/,* tag://g')`: delete the latest batch of tags
  Taken from https://github.com/lerna/lerna/issues/524#issuecomment-298219612
