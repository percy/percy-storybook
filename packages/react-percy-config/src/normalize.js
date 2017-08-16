import defaults from './defaults';
import path from 'path';

export default function normalize(config, packageRoot) {
  const normalizedConfig = {};

  normalizedConfig.includeFiles = config.includeFiles || [];

  normalizedConfig.rootDir = config.rootDir ? path.normalize(config.rootDir) : packageRoot;

  normalizedConfig.snapshotIgnorePatterns =
    config.snapshotIgnorePatterns || defaults.snapshotIgnorePatterns;

  normalizedConfig.snapshotPatterns = config.snapshotPatterns || defaults.snapshotPatterns;

  return normalizedConfig;
}
