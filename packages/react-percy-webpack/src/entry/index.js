import { EntryNames } from './constants';
import findSnapshotFiles from './findSnapshotFiles';
import getEntryPath from './getEntryPath';
import merge from 'webpack-merge';
import writeRenderEntry from './writeRenderEntry';
import writeSnapshotsEntry from './writeSnapshotsEntry';

export default function configureEntry(webpackConfig, percyConfig) {
  const frameworkEntryFile = getEntryPath(EntryNames.framework);

  const renderEntryFile = getEntryPath(EntryNames.render);
  writeRenderEntry(percyConfig, renderEntryFile);

  const snapshotFiles = findSnapshotFiles(percyConfig);
  const snapshotsEntryFile = getEntryPath(EntryNames.snapshots);
  writeSnapshotsEntry(snapshotFiles, snapshotsEntryFile);

  return merge.strategy({
    entry: 'replace',
  })(webpackConfig, {
    entry: {
      [EntryNames.framework]: frameworkEntryFile,
      [EntryNames.render]: renderEntryFile,
      [EntryNames.snapshots]: [...percyConfig.includeFiles, snapshotsEntryFile],
    },
  });
}
