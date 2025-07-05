const path = require('path');

module.exports = {
  stories: ['*.stories.js'],
  addons: ['@storybook/addon-webpack5-compiler-babel'],
  features: {
    postcss: false
  },
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  webpackFinal: async (config) => {
    config.module.rules.push({
      test: /\.(js|jsx|mjs|cjs)$/,
      exclude: /node_modules/,
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          // Tell babel-loader to load its configuration from your babel.config.cjs
          configFile: path.resolve(__dirname, '../../babel.config.cjs'),
        },
      },
    });
    return config;
  },
};