export default function storybookVersion() {
  return process.env['npm_package_dependencies_@storybook/react'] ||
         process.env['npm_package_dependencies_@kadira/storybook'] ||
         'unknown';
}
