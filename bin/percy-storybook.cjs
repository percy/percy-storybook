#!/usr/bin/env node

let log = require('@percy/logger')('percy-storybook-script'); // eslint-disable-line import/no-extraneous-dependencies
log.warn('The `percy-storybook` command has been deprecated. Use @percy/cli instead.');
log.info('See upgrade instructions here: https://github.com/percy/percy-storybook#upgrading');

process.exit(1);
