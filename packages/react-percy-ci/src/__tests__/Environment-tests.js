import Environment from '../Environment';

let mockFrameworkGlobals;
jest.mock('@percy-io/react-percy-test-framework', () => context => {
  Object.keys(mockFrameworkGlobals).forEach(key => {
    context[key] = mockFrameworkGlobals[key];
  });
});

let environment;
let suiteSnapshots;

beforeEach(() => {
  suiteSnapshots = [];
  mockFrameworkGlobals = {
    percySnapshot: jest.fn(name => suiteSnapshots.push(name)),
    suite: jest.fn((name, fn) => fn()),
  };

  environment = new Environment({
    rootDir: '/foo',
  });
});

it('can parse basic files', () => {
  expect(() =>
    environment.runScript({
      path: '/foo/bar.percy.js',
      src: `
            const a = 1;
        `,
    }),
  ).not.toThrow();
});

it('references to global work', () => {
  expect(() =>
    environment.runScript({
      path: '/foo/bar.percy.js',
      src: `
            global.foo = 'bar';
        `,
    }),
  ).not.toThrow();
});

it('immediate works', () => {
  expect(() =>
    environment.runScript({
      path: '/foo/bar.percy.js',
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
      path: '/foo/bar.percy.js',
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
      path: '/foo/bar.percy.js',
      src: `
            const x = setTimeout(() => {}, 10);
            clearTimeout(x);
        `,
    }),
  ).not.toThrow();
});

it('console works', async () => {
  // eslint-disable-next-line no-console
  console.log = jest.fn();

  await environment.runScript({
    path: '/foo/bar.percy.js',
    src: `
            console.log('foo');
        `,
  });

  // eslint-disable-next-line no-console
  expect(console.log).toHaveBeenCalledWith('foo');
});

it('framework globals work', async () => {
  await environment.runScript({
    path: '/foo/bar.percy.js',
    src: `
            percySnapshot('snapshot', () => {
            });
        `,
  });

  expect(mockFrameworkGlobals.percySnapshot).toHaveBeenCalledWith('snapshot', expect.any(Function));
});

it('wraps script in a suite', async () => {
  await environment.runScript({
    path: '/foo/bar.percy.js',
    src: `
            percySnapshot('snapshot', () => {
            });
        `,
  });

  expect(mockFrameworkGlobals.suite).toHaveBeenCalledWith('', expect.any(Function));
  expect(suiteSnapshots).toEqual(['snapshot']);
});
