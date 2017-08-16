import findSnapshotFiles from './findSnapshotFiles';
import merge from 'webpack-merge';
import path from 'path';

export default function configureEntry(webpackConfig, percyConfig) {
  const snapshotFiles = findSnapshotFiles(percyConfig);

  const entry = snapshotFiles.reduce((prev, file) => {
    const entryName = path
      .relative(percyConfig.rootDir, file)
      .replace(new RegExp(`${path.extname(file)}$`), '');
    return {
      ...prev,
      [entryName]: file,
    };
  }, {});

  if (percyConfig.includeFiles && percyConfig.includeFiles.length) {
    entry['__percy_include__'] = percyConfig.includeFiles;
  }

  return merge.strategy({
    entry: 'replace',
  })(webpackConfig, {
    entry,
  });
}
