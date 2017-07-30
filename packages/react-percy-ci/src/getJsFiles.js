export default function getJsFiles(assets) {
  return Object.keys(assets).filter(name => /\.js$/.test(name)).map(name => ({
    path: name,
    src: assets[name],
  }));
}
