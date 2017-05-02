import ApiClient from '@percy-io/react-percy-api-client';
import compileAssets from './compileAssets';
import createDebug from 'debug';
import getJsFiles from './getJsFiles';
import render from '@percy-io/react-percy-server-render';
import TestEnvironment from './TestEnvironment';

const debug = createDebug('react-percy:ci');

export default async function run(percyConfig, webpackConfig, percyToken) {
    const client = new ApiClient(percyToken);

    debug('compiling assets');
    const assets = await compileAssets(percyConfig, webpackConfig);

    const environment = new TestEnvironment();
    const jsFiles = getJsFiles(assets);
    jsFiles.forEach((jsFile) => {
        debug('executing %s', jsFile.path);
        environment.runScript(jsFile);
    });

    debug('getting test cases');
    const testCases = await environment.getTestCases();
    debug('found %d test cases', testCases.length);

    const resources = client.makeResources(assets);
    const build = await client.createBuild(resources);

    try {
        const missingResources = client.getMissingResources(build, resources);
        debug('found missing resources %o', missingResources);
        await client.uploadResources(build, missingResources);
        await client.runSnapshots(build, testCases, assets, render);
    } finally {
        await client.finalizeBuild(build);
    }
}
