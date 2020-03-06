export default function storybookVersion() {
  return (
    // storybook react dependencies
    process.env['npm_package_dependencies_@storybook/react'] ||
    process.env.npm_package_dependencies__storybook_react ||
    // storybook react dev dependencies
    process.env['npm_package_devDependencies_@storybook/react'] ||
    process.env.npm_package_devDependencies__storybook_react ||
    // storybook vue dependencies
    process.env['npm_package_dependencies_@storybook/vue'] ||
    process.env.npm_package_dependencies__storybook_vue ||
    // storybook vue dev dependencies
    process.env['npm_package_devDependencies_@storybook/vue'] ||
    process.env.npm_package_devDependencies__storybook_vue ||
    // storybook angular dependencies
    process.env['npm_package_dependencies_@storybook/angular'] ||
    process.env.npm_package_dependencies__storybook_angular ||
    // storybook angular dev dependencies
    process.env['npm_package_devDependencies_@storybook/angular'] ||
    process.env.npm_package_devDependencies__storybook_angular ||
    // storybook ember dependencies
    process.env['npm_package_dependencies_@storybook/ember'] ||
    process.env.npm_package_dependencies__storybook_ember ||
    // storybook ember dev dependencies
    process.env['npm_package_devDependencies_@storybook/ember'] ||
    process.env.npm_package_devDependencies__storybook_ember ||
    'unknown'
  );
}
