module.exports = {
  extends: ['eslint:recommended', 'prettier', 'plugin:react/recommended'],

  plugins: ['import', 'jest', 'prettier', 'react'],

  parser: 'babel-eslint',

  parserOptions: {
    ecmaVersion: 2017,
    ecmaFeatures: {
      jsx: true,
    },
  },

  env: {
    es6: true,
    node: true,
  },

  rules: {
    'jsx-quotes': ['error', 'prefer-double'],

    'import/first': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
        optionalDependencies: true,
        peerDependencies: true,
      },
    ],

    'prettier/prettier': [
      'error',
      {
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'all',
        bracketSpacing: true,
      },
    ],
  },

  overrides: [
    {
      files: ['**/{__mocks__,__tests__}/**/*.js', 'integration-tests/jest.setup.js'],
      env: {
        'jest/globals': true,
      },
      rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
      },
    },
    {
      files: ['**/__percy__/**/*.{js,jsx}', '**/*.percy.{js,jsx}'],
    },
    {
      files: ['integration-tests/**'],
      env: {
        browser: true,
        jasmine: true,
      },
    },
  ],
};
