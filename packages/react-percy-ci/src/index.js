import ApiClient from '@percy-io/react-percy-api-client';
import compileAssets from './compileAssets';
import createDebug from 'debug';
import each from 'promise-each';
import Environment from './Environment';
import getJsFiles from './getJsFiles';
import render from '@percy-io/react-percy-server-render';

const debug = createDebug('react-percy:ci');

export default async function run(percyConfig, webpackConfig, percyToken) {
  const client = new ApiClient(percyToken);

  debug('compiling assets');
  const assets = await compileAssets(percyConfig, webpackConfig);

  const environment = new Environment();
  const jsFiles = getJsFiles(assets);
  await each(async jsFile => {
    debug('executing %s', jsFile.path);
    await environment.runScript(jsFile);
  })(jsFiles);

  debug('getting snapshots');
  const snapshots = await environment.getSnapshots();
  debug('found %d snapshots', snapshots.length);

  const resources = client.makeResources(assets);
  const build = await client.createBuild(resources);

  try {
    const missingResources = client.getMissingResources(build, resources);
    debug('found missing resources %o', missingResources);
    await client.uploadResources(build, missingResources);
    await client.runSnapshots(build, snapshots, assets, render);
  } finally {
    await client.finalizeBuild(build);
  }
}
