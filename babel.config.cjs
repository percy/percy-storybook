module.exports = {
  presets: [
    ['@babel/env', {
      modules: false,
      targets: {
        node: '20'
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
