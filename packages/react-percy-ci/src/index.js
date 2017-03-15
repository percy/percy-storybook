import { compile, configureEntry } from 'react-percy-webpack';
import ApiClient from 'react-percy-api-client';
import createSuite from 'react-percy-test-framework';
import getEntry from './getEntry';
import readJsFiles from './readJsFiles';
import render from 'react-percy-render';

export default async function run(percyConfig, webpackConfig, percyToken) {
    const client = new ApiClient(percyToken);

    const entry = getEntry(percyConfig);
    webpackConfig = configureEntry(webpackConfig, percyConfig, entry);
    const assets = await compile(webpackConfig);

    const rootSuite = createSuite(global);
    readJsFiles(assets);

    const testCases = await rootSuite.getTestCases();

    const resources = client.makeResources(assets);
    const build = await client.createBuild(resources);

    try {
        const missingResources = client.getMissingResources(build, resources);
        await client.uploadResources(build, missingResources);
        await client.runSnapshots(build, testCases, assets, render);
    } finally {
        await client.finalizeBuild(build);
    }
}
