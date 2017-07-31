# eslint-plugin-react-percy

[![Package Status](https://img.shields.io/npm/v/eslint-plugin-react-percy.svg)](https://www.npmjs.com/package/eslint-plugin-react-percy)
[![Build Status](https://travis-ci.org/percy/react-percy.svg?branch=master)](https://travis-ci.org/percy/react-percy)

ESLint plugin for `react-percy`.

## Installation

```
$ yarn add --dev eslint eslint-plugin-react-percy
```

**Note:** If you installed ESLint globally then you must also install `eslint-plugin-react-percy` globally.

## Usage

Add `react-percy` to the plugins section of your `.eslintrc` configuration file:

```json
{
  "plugins": [
    "react-percy"
  ]
}
```

You can whitelist the environment variables provided by `react-percy` by doing:

```json
{
  "env": {
    "react-percy/globals": true
  }
}
```

If you're using ESLint v4.1.0 or later, you can instead scope the `react-percy` environment variables to only `react-percy` test files by doing:

```json
{
  "overrides": [
    {
      "files": [
        "**/__percy__/**/.*.{js,jsx}",
        "**/*.percy.{js,jsx}"
      ],
      "env": {
        "react-percy/globals": true
      }
    }
  ]
}
```
