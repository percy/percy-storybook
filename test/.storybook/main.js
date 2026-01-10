module.exports = {
  stories: ['*.stories.js'],
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
