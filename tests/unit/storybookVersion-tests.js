import storybookVersion from '../../src/storybookVersion';

let existingReactStorybookVersion;
let existingAngularStorybookVersion;

beforeEach(() => {
  existingReactStorybookVersion = process.env['npm_package_dependencies_@storybook/react'];
  existingAngularStorybookVersion = process.env['npm_package_dependencies_@storybook/angular'];
});

afterEach(() => {
  process.env['npm_package_dependencies_@storybook/react'] = existingReactStorybookVersion;
  process.env['npm_package_dependencies_@storybook/angular'] = existingAngularStorybookVersion;
});

it('returns unknown when storybook is not found', () => {
  delete process.env['npm_package_dependencies_@storybook/react'];
  delete process.env['npm_package_dependencies_@storybook/angular'];
  expect(storybookVersion()).toEqual('unknown');
});

it('returns the expected storybook 5.x version when using react storybook', () => {
  delete process.env['npm_package_dependencies_@storybook/angular'];
  process.env['npm_package_dependencies_@storybook/react'] = '5.0.0';
  expect(storybookVersion()).toEqual('5.0.0');
});

it('returns the expected storybook 5.x version when using angular storybook', () => {
  delete process.env['npm_package_dependencies_@storybook/react'];
  process.env['npm_package_dependencies_@storybook/angular'] = '5.0.0';
  expect(storybookVersion()).toEqual('5.0.0');
});
