module.exports = {
  presets: [
    ['@babel/env', {
      modules: false,
      targets: {
        node: '18'
      }
    }],
    '@babel/preset-react'
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
