# react-percy

## Install

```sh
yarn
```

## Overview

The core code lives in the `packages` directory. In there, you'll find a subdirectory for each package that will eventually get published to npm.

The "master" package is `react-percy`, which at the moment consists of a simple CLI that takes in the path of a Webpack config file and then delegates all the actual work to the other helper packages (which are its dependencies).

This multi-package monorepo structure is used for many other big JS projects, including React, Babel, and Jest.

[TODO] I'll add more docs on what each package does later.

In its current state, `react-percy` takes in a webpack config, generates an in-memory JS file that dynamically imports any screenshot test files, compiles that JS file using the provided webpack config, and uploads the resulting test cases to Percy.

Because we haven't actually published all these packages to npm yet, you can't just `npm install react-percy` in a test project and have it magically work out. Instead, to test it, I've set up an `integration-tests` folder that's basically acting as a test application. (In the future we might want to update it to contain a bunch of different example applications that test different functionality our users care about.) To simulate what will actually happen when a user does `npm install react-percy`, you can instead run `npm run build` and `node scripts/setup-integration-tests.js`. That will install all the latest `react-percy` code in `integration-tests/node_modules`.

Once you've bootstrapped everything in `integration-tests`, you can then run `npm run test:screenshots -- --config ./path/to/webpack.config.js`, and it should do its magic. Note that since you're running CI mode locally, you'll need to set a few environment variables first for it to work. `PERCY_TOKEN`, and `PERCY_PROJECT`.

There are already a couple of simple webpack configs in that `integration-tests` repo along with a few test cases, so if you want to just use one of those we can see if it uploads to Percy correctly.

If you want to try out a completely custom webpack project, you can try updating the `scripts/setup-integration-tests.js` code to install `react-percy` in whatever repo you're working on instead of `integration-tests`.
