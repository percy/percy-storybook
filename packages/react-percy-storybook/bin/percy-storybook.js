#!/usr/bin/env node

require('../lib/cli').run(process.argv.slice(2))
    .then(() => {
      process.on('exit', () => process.exit(0));
    })
    .catch((err) => {
        console.log('Error: ', err); // eslint-disable-line no-console
        process.on('exit', () => process.exit(1));
    });
