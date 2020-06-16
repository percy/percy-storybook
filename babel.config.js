module.exports = {
  presets: [
    ['@babel/env', {
      targets: {
        node: '10'
      }
    }]
  ],
  plugins: [
    '@babel/proposal-class-properties'
  ],
  env: {
    test: {
      plugins: [
        ['istanbul', {
          exclude: ['dist', 'test']
        }]
      ]
    }
  }
};
