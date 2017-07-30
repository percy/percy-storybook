import getWebpackConfigExports from '../getWebpackConfigExports';

it('throws given no config', () => {
  expect(() => getWebpackConfigExports(null)).toThrow();
});

it('throws given array', () => {
  expect(() =>
    getWebpackConfigExports([
      {
        config1: true,
      },
      {
        config2: true,
      },
    ]),
  ).toThrow();
});

it('returns ES5 config object', () => {
  const config = getWebpackConfigExports({
    config: true,
  });

  expect(config).toEqual({
    config: true,
  });
});

it('returns ES6 config object', () => {
  const config = getWebpackConfigExports({
    default: {
      config: true,
    },
  });

  expect(config).toEqual({
    config: true,
  });
});
