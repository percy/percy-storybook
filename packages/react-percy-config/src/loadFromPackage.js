export default function loadFromPackage(filePath) {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const packageData = require(filePath);
  return packageData.percy || {};
}
