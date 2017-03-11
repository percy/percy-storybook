import { createBuild, finalizeBuild } from './build';
import { getMissingResources, makeResources, uploadResources } from './resources';
import PercyClient from 'percy-client';
import { runSnapshots } from './snapshot';

export default class PercyApiClient {

    constructor(token) {
        this._client = new PercyClient({
            token
        });
    }

    createBuild(resources) {
        return createBuild(this._client, resources);
    }

    finalizeBuild(build) {
        return finalizeBuild(this._client, build);
    }

    getMissingResources(build, resources) {
        return getMissingResources(build, resources);
    }

    makeResources(assets) {
        return makeResources(this._client, assets);
    }

    runSnapshots(build, testCases, assets, renderer) {
        return runSnapshots(this._client, build, testCases, assets, renderer);
    }

    uploadResources(build, resources) {
        return uploadResources(this._client, build, resources);
    }

}
