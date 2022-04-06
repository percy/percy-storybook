module.exports = {
  presets: [
    ['@babel/env', {
      modules: false,
      targets: {
        node: '14'
      }
    }]
  ],
  plugins: [
    ['@babel/proposal-class-properties', { loose: true }],
    ['@babel/plugin-proposal-private-methods', { loose: true }],
    ['@babel/plugin-proposal-private-property-in-object', { loose: true }]
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
