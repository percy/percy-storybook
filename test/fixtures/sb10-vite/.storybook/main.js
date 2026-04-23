/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@percy/storybook'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  }
};
export default config;
