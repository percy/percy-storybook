import reactVersion from '../reactVersion';

let existingReactVersion;

beforeEach(() => {
  existingReactVersion = process.env.npm_package_dependencies_react;
});

afterEach(() => {
  process.env.npm_package_dependencies_react = existingReactVersion;
});

it('returns unknown when react is not found', () => {
  delete process.env.npm_package_dependencies_react;
  expect(reactVersion()).toEqual('unknown');
});

it('returns the expected react version', () => {
  process.env.npm_package_dependencies_react = '1.15';
  expect(reactVersion()).toEqual('1.15');
});
