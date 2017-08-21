import { EntryNames } from './constants';
import tmp from 'tmp';

const getTempFile = () => tmp.fileSync({ postfix: '.js' }).name;

export default function getEntryPath(entryName) {
  switch (entryName) {
    case EntryNames.framework:
      return require.resolve('./framework');

    case EntryNames.render:
    case EntryNames.snapshots:
      return getTempFile();

    default:
      throw new Error(`Unknown entry type ${entryName}`);
  }
}
