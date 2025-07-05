module.exports = {
  stories: ['*.stories.js'],
  addons: ['@storybook/addon-webpack5-compiler-babel'],
  features: {
    postcss: false
  },
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  }
};
