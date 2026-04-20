#!/usr/bin/env node
'use strict';

// Detect color support: respect NO_COLOR (https://no-color.org/) and non-TTY pipes
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const bold = useColor ? '\x1b[1m' : '';
const cyan = useColor ? '\x1b[36m' : '';
const reset = useColor ? '\x1b[0m' : '';
const dim = useColor ? '\x1b[2m' : '';

console.log('');
console.log(bold + cyan + '  Percy Storybook Addon is now available!' + reset);
console.log('');
console.log('  Open the "Percy" tab in Storybook to run');
console.log('  visual tests directly from the UI.');
console.log('');
console.log(dim + '  Docs: https://www.browserstack.com/docs/percy/references/storybook-addon' + reset);
console.log('');
