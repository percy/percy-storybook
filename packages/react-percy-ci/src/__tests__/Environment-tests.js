import Environment from '../Environment';

let mockFrameworkGlobals;
jest.mock('@percy-io/react-percy-test-framework', () => context => {
  Object.keys(mockFrameworkGlobals).forEach(key => {
    context[key] = mockFrameworkGlobals[key];
  });
});

let environment;

beforeEach(() => {
  mockFrameworkGlobals = {
    describe: jest.fn(),
  };

  environment = new Environment();
});

it('can parse basic files', () => {
  expect(() =>
    environment.runScript({
      path: '/foo/bar.js',
      src: `
            const a = 1;
        `,
    }),
  ).not.toThrow();
});

it('references to global work', () => {
  expect(() =>
    environment.runScript({
      path: '/foo/bar.js',
      src: `
            global.foo = 'bar';
        `,
    }),
  ).not.toThrow();
});

it('immediate works', () => {
  expect(() =>
    environment.runScript({
      path: '/foo/bar.js',
      src: `
            const x = setImmediate(() => {});
            clearImmediate(x);
        `,
    }),
  ).not.toThrow();
});

it('intervals work', () => {
  expect(() =>
    environment.runScript({
      path: '/foo/bar.js',
      src: `
            const x = setInterval(() => {}, 10);
            clearInterval(x);
        `,
    }),
  ).not.toThrow();
});

it('timeouts work', () => {
  expect(() =>
    environment.runScript({
      path: '/foo/bar.js',
      src: `
            const x = setTimeout(() => {}, 10);
            clearTimeout(x);
        `,
    }),
  ).not.toThrow();
});

it('console works', () => {
  // eslint-disable-next-line no-console
  console.log = jest.fn();

  environment.runScript({
    path: '/foo/bar.js',
    src: `
            console.log('foo');
        `,
  });

  // eslint-disable-next-line no-console
  expect(console.log).toHaveBeenCalledWith('foo');
});

it('framework globals work', () => {
  environment.runScript({
    path: '/foo/bar.js',
    src: `
            describe('suite', () => {
            });
        `,
  });

  expect(mockFrameworkGlobals.describe).toHaveBeenCalledWith('suite', expect.any(Function));
});
