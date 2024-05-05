module.exports = {
  presets: [
    ['@babel/env', {
      modules: false,
      targets: {
        node: '18'
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