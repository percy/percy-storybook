import compile from '../';

let mockCompiler;
jest.mock('../createCompiler', () => () => mockCompiler);

const webpackConfig = { config: true };

let webpackError;
let errors;
let assets;

beforeEach(() => {
  webpackError = undefined;
  errors = [];
  assets = {};
  mockCompiler = {
    run: fn => fn(webpackError, {
      compilation: {
        assets,
        errors
      }
    })
  };
});

const givenWebpackError = (error) => { webpackError = error; };
const givenCompileError = (error) => { errors.push(error); };
const givenAsset = (path, src) => { assets[path] = { source: () => src }; };

it('rejects when webpack errors internally', async () => {
  givenWebpackError('internal webpack error');

  try {
    await compile(webpackConfig);
    throw new Error('`compile` should have failed');
  } catch (e) {
    expect(e).toEqual([
      'internal webpack error'
    ]);
  }
});

it('rejects with webpack fails to compile', async () => {
  givenCompileError('file 1 failed to compile');
  givenCompileError('file 2 failed to compile');

  try {
    await compile(webpackConfig);
    throw new Error('`compile` should have failed');
  } catch (e) {
    expect(e).toEqual([
      'file 1 failed to compile',
      'file 2 failed to compile'
    ]);
  }
});

it('resolves with compiled files when webpack succeeds', async () => {
  givenAsset('/file1.js', 'const x = 1;');
  givenAsset('/file2.css', '.foo { background: red; }');

  const files = await compile(webpackConfig);

  expect(files).toEqual({
    '/file1.js': 'const x = 1;',
    '/file2.css': '.foo { background: red; }'
  });
});
