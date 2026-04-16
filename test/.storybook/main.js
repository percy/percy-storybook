const path = require('path');

module.exports = {
  stories: ['*.stories.js'],
  addons: [
    // Load the Percy preset directly from the local source tree
    // (no publish / npm link needed)
    { name: path.resolve(__dirname, '../../preset.cjs') }
  ],
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
      exclude: /node_modules\/(?!@browserstack)/,
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [
            ['@babel/preset-env', { modules: false }],
            ['@babel/preset-react', { runtime: 'automatic' }]
          ]
        }
      },
    });
    return config;
  },
};
