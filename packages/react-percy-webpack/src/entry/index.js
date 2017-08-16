import findSnapshotFiles from './findSnapshotFiles';
import merge from 'webpack-merge';

export default function configureEntry(webpackConfig, percyConfig) {
  const snapshotFiles = findSnapshotFiles(percyConfig);

  return merge.strategy({
    entry: 'replace',
  })(webpackConfig, {
    entry: {
      percy: [...percyConfig.includeFiles, ...snapshotFiles],
    },
  });
}
