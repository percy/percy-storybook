# Contributing to @percy/storybook

✨ Thanks for contributing to **@percy/storybook**! ✨

As a contributor, here are the guidelines we would like you to follow:
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding rules](#coding-rules)
- [Working with the code](#working-with-the-code)

We also recommend that you read [How to Contribute to Open Source](https://opensource.guide/how-to-contribute).

## Submitting a Pull Request

Good pull requests, whether patches, improvements, or new features, are a fantastic help. They should remain focused in scope and avoid containing unrelated commits.

**Please ask first** before embarking on any significant pull requests (e.g. implementing features, refactoring code), otherwise you risk spending a lot of time working on something that the project's developers might not want to merge into the project.

If you have never created a pull request before, welcome 🎉 😄. [Here is a great tutorial](https://opensource.guide/how-to-contribute/#opening-a-pull-request) on how to send one :)

Here is a summary of the steps to follow:

1. [Set up the workspace](#set-up-the-workspace)
2. If you cloned a while ago, get the latest changes from upstream and update dependencies:
```bash
$ git checkout master
$ git pull upstream master
$ rm -rf node_modules
$ yarn
```
3. Create a new topic branch (off the main project development branch) to contain your feature, change, or fix:
```bash
$ git checkout -b <topic-branch-name>
```
4. Make your code changes, following the [Coding rules](#coding-rules)
5. Push your topic branch up to your fork:
```bash
$ git push origin <topic-branch-name>
```
6. [Open a Pull Request](https://help.github.com/articles/creating-a-pull-request/#creating-the-pull-request) with a clear title and description.

**Tips**:
- For ambitious tasks, open a [draft Pull Request](https://github.blog/2019-02-14-introducing-draft-pull-requests/), in order to get feedback and help from the community.
- [Allow @percy/storybook maintainers to make changes to your Pull Request branch](https://help.github.com/articles/allowing-changes-to-a-pull-request-branch-created-from-a-fork). This way, we can rebase it and make some minor changes if necessary. All changes we make will be done in new commit and we'll ask for your approval before merging them.

## Coding rules

### Source code

To ensure consistency and quality throughout the source code, all code modifications must have:
- No [linting](#lint) errors
- A [test](#tests) for every possible case introduced by your code change 
- We in general expect e2e test cases with minimum mocking, mocking is discouraged unless there is no other way of testing the same.
- **100%** test coverage
- [Valid commit message(s)](#commit-message-guidelines)

### Commit message guidelines

#### Atomic commits

If possible, make [atomic commits](https://en.wikipedia.org/wiki/Atomic_commit), which means:
- a commit should contain exactly one self-contained functional change
- a functional change should be contained in exactly one commit
- a commit should not create an inconsistent state (such as test errors, linting errors, partial fix, feature without documentation etc...)

A complex feature can be broken down into multiple commits as long as each one maintains a consistent state and consists of a self-contained change. We further always squash and merge commits to make sure that on base branch the commit history looks good and is easy to understand all changes for a specific feature.

## Working with the code

### Set up the workspace

[Fork](https://guides.github.com/activities/forking/#fork) the project, [clone](https://guides.github.com/activities/forking/#clone) your fork, configure the remotes and install the dependencies:

```bash
# Clone your fork of the repo into the current directory
$ git clone https://github.com/percy/percy-storybook
# Navigate to the newly cloned directory
$ cd percy-storybook
# Assign the original repo to a remote called "upstream"
$ git remote add upstream https://github.com/percy/percy-storybook
# Install the dependencies
$ yarn
```

### Lint

[@percy/storybook](https://github.com/percy/percy-storybook) uses [eslint](https://github.com/eslint/eslint) for linting.

Before pushing your code changes make sure there are no linting errors with `yarn lint`.

### Tests

You can run the tests with:

```bash
$ yarn test
```

And get the coverage number for tests with:

```bash
$ yarn test:coverage
```

