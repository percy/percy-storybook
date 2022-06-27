import url from 'url';
import babel from '@babel/core';

export async function transformSource(source, context, defaultTransformSource) {
  let transform = (src = source) => defaultTransformSource(src, context, defaultTransformSource);
  if (context.format !== 'module' && context.format !== 'commonjs') return transform();
  if (typeof source !== 'string') source = Buffer.from(source);
  if (Buffer.isBuffer(source)) source = source.toString();

  return transform((await babel.transformAsync(source, {
    filename: url.fileURLToPath(context.url),
    sourceType: context.format,
    babelrcRoots: ['.']
  }))?.code);
}
