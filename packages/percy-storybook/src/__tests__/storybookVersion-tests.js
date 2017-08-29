import storybookVersion from '../storybookVersion';

let existingStorybookVersion;
let existingKadiraStorybookVersion;

beforeEach(() => {
  existingStorybookVersion = process.env['npm_package_dependencies_@storybook/react'];
  existingKadiraStorybookVersion = process.env['npm_package_dependencies_@kadira/storybook'];
});

afterEach(() => {
  process.env['npm_package_dependencies_@storybook/react'] = existingStorybookVersion;
  process.env['npm_package_dependencies_@kadira/storybook'] = existingKadiraStorybookVersion;
});

it('returns unknown when storybook is not found', () => {
  delete process.env['npm_package_dependencies_@storybook/react'];
  delete process.env['npm_package_dependencies_@kadira/storybook'];

  expect(storybookVersion()).toEqual('unknown');
});

it('returns the expected storybook 2.x version', () => {
  delete process.env['npm_package_dependencies_@storybook/react'];
  process.env['npm_package_dependencies_@kadira/storybook'] = '2.15.1';

  expect(storybookVersion()).toEqual('2.15.1');
});

it('returns the expected storybook 3.x version', () => {
  delete process.env['npm_package_dependencies_@kadira/storybook'];
  process.env['npm_package_dependencies_@storybook/react'] = '3.0.0';

  expect(storybookVersion()).toEqual('3.0.0');
});
