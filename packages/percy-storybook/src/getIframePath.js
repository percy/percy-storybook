import path from 'path';
const fs = require('fs');

// Get the path of the iframe.html file that buld-storybook creates, and confirm it exists
export default function getIframePath(options = {}) {
  if (!options.buildDir) throw new Error('buildDir option is missing');

  const storybookStaticPath = path.resolve(options.buildDir);
  const iframePath = path.join(storybookStaticPath, 'iframe.html');

  if (!fs.existsSync(iframePath)) {
    throw new Error(
      `Static Storybook not found at ${storybookStaticPath}.` +
        'Have you called build-storybook first?',
    );
  }
  return iframePath;
}
