export default function storybookVersion() {
         // storybook react dependencies
  return process.env['npm_package_dependencies_@storybook/react'] ||
         process.env.npm_package_dependencies__storybook_react ||

         // storybook react dev dependencies
         process.env['npm_package_devDependencies_@storybook/react'] ||
         process.env.npm_package_devDependencies__storybook_react ||

         // kadira storybook dependencies
         process.env['npm_package_dependencies_@kadira/storybook'] ||
         process.env.npm_package_dependencies__kadira_storybook ||

         // kadira storybook dev dependencies
         process.env['npm_package_devDependencies_@kadira/storybook'] ||
         process.env.npm_package_devDependencies__kadira_storybook ||
         'unknown';
}
