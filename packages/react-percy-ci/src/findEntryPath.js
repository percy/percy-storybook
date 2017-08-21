import path from 'path';

export default function findEntryPath(assets, entry) {
  return Object.keys(assets).find(name => path.basename(name, '.js') === entry);
}
