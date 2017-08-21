import createDebug from 'debug';

const debug = createDebug('react-percy:api');

export default function createBuild(percyClient, resources) {
  debug('creating build');
  return new Promise((resolve, reject) => {
    percyClient
      .createBuild(process.env.PERCY_PROJECT || process.env.TRAVIS_REPO_SLUG, {
        resources,
      })
      .then(
        response => {
          debug('created build at %s', response.body.data.attributes['web-url']);
          resolve(response.body.data);
        },
        err => {
          debug('error creating build %s', err.response.body);
          reject(err.response.body);
        },
      );
  });
}
