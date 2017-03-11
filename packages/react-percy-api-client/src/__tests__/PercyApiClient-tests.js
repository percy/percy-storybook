import { createBuild, finalizeBuild } from '../build';
import { getMissingResources, makeResources, uploadResources } from '../resources';
import PercyApiClient from '../';
import PercyClient from 'percy-client';
import { runSnapshots } from '../snapshot';

jest.mock('../build', () => ({
    createBuild: jest.fn(),
    finalizeBuild: jest.fn()
}));

jest.mock('../resources', () => ({
    getMissingResources: jest.fn(),
    makeResources: jest.fn(),
    uploadResources: jest.fn()
}));

jest.mock('../snapshot', () => ({
    runSnapshots: jest.fn()
}));

let apiClient;

beforeEach(() => {
    apiClient = new PercyApiClient('token');
});

it('createBuild injects percy client arg', () => {
    const resources = [{ resource1: true }, { resource2: true }];

    apiClient.createBuild(resources);

    expect(createBuild).toHaveBeenCalledWith(expect.any(PercyClient), resources);
});

it('finalizeBuild injects percy client arg', () => {
    const build = { id: 'buildid' };

    apiClient.finalizeBuild(build);

    expect(finalizeBuild).toHaveBeenCalledWith(expect.any(PercyClient), build);
});

it('getMissingResources is simple pass-through', () => {
    const build = { id: 'buildid' };
    const resources = [{ resource1: true }, { resource2: true }];

    apiClient.getMissingResources(build, resources);

    expect(getMissingResources).toHaveBeenCalledWith(build, resources);
});

it('makeResources injects percy client arg', () => {
    const assets = { 'foo.css': '.foo { color: red }' };

    apiClient.makeResources(assets);

    expect(makeResources).toHaveBeenCalledWith(expect.any(PercyClient), assets);
});

it('runSnapshots injects percy client arg', () => {
    const build = { id: 'buildid' };
    const testCases = [{ testCase: 1 }, { testCase: 2 }];
    const assets = { 'foo.css': '.foo { color: red }' };
    const renderer = () => {};

    apiClient.runSnapshots(build, testCases, assets, renderer);

    expect(runSnapshots).toHaveBeenCalledWith(expect.any(PercyClient), build, testCases, assets, renderer);
});

it('uploadResources injects percy client arg', () => {
    const build = { id: 'buildid' };
    const resources = [{ resource1: true }, { resource2: true }];

    apiClient.uploadResources(build, resources);

    expect(uploadResources).toHaveBeenCalledWith(expect.any(PercyClient), build, resources);
});
