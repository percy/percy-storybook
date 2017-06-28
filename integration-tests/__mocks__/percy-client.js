export const createBuild = jest.fn((project, { resources }) => Promise.resolve({
  body: {
    data: {
      id: 'test-build',
      attributes: {
        'web-url': 'http://percy.local/test-build'
      },
      relationships: {
        'missing-resources': {
          data: resources
        }
      }
    }
  }
}));

export const createSnapshot = jest.fn(() => Promise.resolve({
  body: {
    data: {
      id: 'test-snapshot'
    }
  }
}));

export const finalizeBuild = jest.fn(() => Promise.resolve());

export const finalizeSnapshot = jest.fn(() => Promise.resolve());

export const makeResource = jest.fn((resource) => {
  const sha = `sha-${resource.resourceUrl}-sha`;
  return Object.assign({}, resource, {
    id: sha,
    sha
  });
});

export const uploadResource = jest.fn(() => Promise.resolve());

export default class FakePercyClient {
  createBuild = createBuild;
  createSnapshot = createSnapshot;
  finalizeBuild = finalizeBuild;
  finalizeSnapshot = finalizeSnapshot;
  makeResource = makeResource;
  uploadResource = uploadResource;
}
