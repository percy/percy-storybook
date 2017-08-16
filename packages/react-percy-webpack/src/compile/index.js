import createCompiler from './createCompiler';

export default function compile(percyConfig, webpackConfig) {
  return new Promise((resolve, reject) => {
    const compiler = createCompiler(percyConfig, webpackConfig);
    compiler.run((err, stats) => {
      if (err) {
        return reject([err]);
      }

      if (stats.compilation.errors.length > 0) {
        return reject(stats.compilation.errors);
      }

      const assets = stats.compilation.assets;
      const files = {};
      Object.keys(assets).forEach(key => {
        files[key] = assets[key].source();
      });
      return resolve(files);
    });
  });
}
