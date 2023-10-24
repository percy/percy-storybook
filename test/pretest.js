import spawn from 'cross-spawn';

let storybookVersion = process.env.STORYBOOK_VERSION || '6';
let args = storybookVersion === '7' ? ['build'] : [];
args = args.concat(['--config-dir=./test/.storybook', '--output-dir=./test/.storybook-build', '--loglevel error']);
let storybookBinary = storybookVersion === '7' ? 'storybook' : 'build-storybook';

console.log(`storybookBinary - ${storybookBinary}`);
console.log(`storybookArgs - ${args}`);

spawn(storybookBinary, args, { stdio: 'inherit' });
