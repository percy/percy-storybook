const path = require('path');

module.exports = {
  stories: ['*.stories.js'],
  // No compiler addon: babel-loader is wired up directly in webpackFinal below.
  addons: [{ name: path.resolve(__dirname, '../../preset.cjs') }],
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
      },
    });
    return config;
  },
};
