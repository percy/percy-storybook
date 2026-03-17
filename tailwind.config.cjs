const { globalTailwindConfig } = require('@browserstack/tailwind-config');

module.exports = {
  ...globalTailwindConfig,
  content: [
    // Scan design-stack dist files for Tailwind class usage
    './node_modules/@browserstack/design-stack/dist/**/*.{js,mjs}',
    // Scan our own source components
    './src/**/*.{js,jsx}',
  ],
};
