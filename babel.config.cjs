module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false,
      targets: {
        node: '22.12'
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
