const { globalTailwindConfig } = require('@browserstack/tailwind-config');

module.exports = {
  ...globalTailwindConfig,
  content: [
    // Scan design-stack dist files for Tailwind class usage
    './node_modules/@browserstack/design-stack/dist/**/*.{js,jsx,mjs}',
    // Scan review-viewer for Tailwind class usage (browser icons, approve button styles, etc.)
    './node_modules/@browserstack/review-viewer/dist/**/*.{js,jsx,mjs}',
    './node_modules/@browserstack/review-viewer/modules/**/*.{js,jsx}',
    // Scan our own source components
    './src/**/*.{js,jsx}'
  ]
};
