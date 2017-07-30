import * as path from 'path';
import interpret from 'interpret';

const extensions = [...Object.keys(interpret.extensions).filter(ext => ext !== '.js'), '.js'];

export default function getExtension(configPath) {
  for (let i = 0; i < extensions.length; i++) {
    const extension = extensions[i];
    if (configPath.indexOf(extension, configPath.length - extension.length) > -1) {
      return extension;
    }
  }
  return path.extname(configPath);
}
