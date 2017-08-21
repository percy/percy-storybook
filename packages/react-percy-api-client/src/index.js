import { createBuild, finalizeBuild } from './build';
import {
  getMissingResources,
  getMissingResourceShas,
  makeResources,
  makeRootResource,
  uploadResources,
} from './resources';
import PercyClient from 'percy-client';
import { createSnapshot, finalizeSnapshot, runSnapshots } from './snapshot';

export default class PercyApiClient {
  constructor(token, apiUrl, clientInfo = '', environmentInfo = '') {
    this._client = new PercyClient({
      token,
      apiUrl,
      clientInfo,
      environmentInfo,
    });
  }

  createBuild(resources) {
    return createBuild(this._client, resources);
  }

  createSnapshot(build, resources, options) {
    return createSnapshot(this._client, build, resources, options);
  }

  getMissingResources(build, resources) {
    return getMissingResources(build, resources);
  }

  getMissingResourceShas(build) {
    return getMissingResourceShas(build);
  }

  finalizeBuild(build) {
    return finalizeBuild(this._client, build);
  }

  finalizeSnapshot(snapshot) {
    return finalizeSnapshot(this._client, snapshot);
  }

  makeResources(assets) {
    return makeResources(this._client, assets);
  }

  makeRootResource(name, html, encodedResourceParams) {
    return makeRootResource(this._client, name, html, encodedResourceParams);
  }

  runSnapshots(build, snapshots, html, getQueryParams) {
    return runSnapshots(this._client, build, snapshots, html, getQueryParams);
  }

  uploadResources(build, resources) {
    return uploadResources(this._client, build, resources);
  }
}
