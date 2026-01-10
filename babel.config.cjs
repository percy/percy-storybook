module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false,
      targets: {
        node: '20.19'
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
