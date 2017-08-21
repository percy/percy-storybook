export default {
  renderer: '@percy-io/percy-snapshot-render-react',
  snapshotIgnorePatterns: ['**/node_modules/**'],
  snapshotPatterns: ['**/__percy__/**/*.{js,jsx}', '**/*.percy.{js,jsx}'],
};
