module.exports = {
  presets: [
    ['@babel/env', {
      modules: false,
      targets: {
        node: '14'
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
