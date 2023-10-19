module.exports = {
  presets: [
    ['@babel/env', {
      modules: false,
      targets: {
        node: '16'
      }
    }]
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
