#!/usr/bin/env node
'use strict';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const bold = useColor ? '\x1b[1m' : '';
const cyan = useColor ? '\x1b[36m' : '';
const yellow = useColor ? '\x1b[33m' : '';
const green = useColor ? '\x1b[32m' : '';
const reset = useColor ? '\x1b[0m' : '';
const dim = useColor ? '\x1b[2m' : '';

console.log('');
console.log(bold + cyan + '  Percy Storybook Addon is now available!' + reset);
console.log('');
console.log('  To finish setup, register the addon with Storybook using one of the options below:');
console.log('');
console.log(bold + '  Option 1: Automatic (recommended)' + reset);
console.log('    Run the following command in your project root:');
console.log('');
console.log('      ' + green + 'npx storybook add @percy/storybook' + reset);
console.log('');
console.log(bold + '  Option 2: Manual' + reset);
console.log('    Open your Storybook config (usually ' + yellow + '.storybook/main.js' + reset + ' or ' + yellow + '.storybook/main.ts' + reset + ')');
console.log('    and add ' + yellow + "'@percy/storybook'" + reset + ' to the ' + yellow + 'addons' + reset + ' array:');
console.log('');
console.log(dim + '      // .storybook/main.js' + reset);
console.log(dim + '      export default {' + reset);
console.log(dim + "        stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)']," + reset);
console.log(dim + '        addons: [' + reset);
console.log(dim + "          '@storybook/addon-essentials'," + reset);
console.log(dim + "          '@percy/storybook', // 👈 Percy addon" + reset);
console.log(dim + '        ],' + reset);
console.log(dim + '      };' + reset);
console.log('');
console.log('  Then open the "Percy" tab in Storybook to run visual tests from the UI.');
console.log('');
console.log(dim + '  Docs: https://www.browserstack.com/docs/percy/references/storybook-addon' + reset);
console.log('');
