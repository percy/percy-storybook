import createDebug from 'debug';

const debug = createDebug('react-percy:api');

export default function uploadResource(percyClient, build, resource) {
  debug('uploading resource %s', resource.resourceUrl);
  return new Promise((resolve, reject) => {
    percyClient
      .uploadResource(build.id, resource.content)
      .then(() => resolve(), err => reject(err.response.body));
  });
}
