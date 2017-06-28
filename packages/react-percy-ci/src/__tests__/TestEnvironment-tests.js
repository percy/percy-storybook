import TestEnvironment from '../TestEnvironment';

let mockTestFramework;
jest.mock('@percy-io/react-percy-test-framework', () => (context) => {
  Object.keys(mockTestFramework).forEach((key) => {
    context[key] = mockTestFramework[key];
  });
});

let environment;

beforeEach(() => {
  mockTestFramework = {
    describe: jest.fn()
  };

  environment = new TestEnvironment();
});

it('can parse basic files', () => {
  expect(() => environment.runScript({
    path: '/foo/bar.js',
    src: `
            const a = 1;
        `
  })).not.toThrow();
});

it('references to global work', () => {
  expect(() => environment.runScript({
    path: '/foo/bar.js',
    src: `
            global.foo = 'bar';
        `
  })).not.toThrow();
});

it('immediate works', () => {
  expect(() => environment.runScript({
    path: '/foo/bar.js',
    src: `
            const x = setImmediate(() => {});
            clearImmediate(x);
        `
  })).not.toThrow();
});

it('intervals work', () => {
  expect(() => environment.runScript({
    path: '/foo/bar.js',
    src: `
            const x = setInterval(() => {}, 10);
            clearInterval(x);
        `
  })).not.toThrow();
});

it('timeouts work', () => {
  expect(() => environment.runScript({
    path: '/foo/bar.js',
    src: `
            const x = setTimeout(() => {}, 10);
            clearTimeout(x);
        `
  })).not.toThrow();
});

it('console works', () => {
    // eslint-disable-next-line no-console
  console.log = jest.fn();

  environment.runScript({
    path: '/foo/bar.js',
    src: `
            console.log('foo');
        `
  });

    // eslint-disable-next-line no-console
  expect(console.log).toHaveBeenCalledWith('foo');
});

it('test framework globals work', () => {
  environment.runScript({
    path: '/foo/bar.js',
    src: `
            describe('suite', () => {
            });
        `
  });

  expect(mockTestFramework.describe).toHaveBeenCalledWith('suite', expect.any(Function));
});
