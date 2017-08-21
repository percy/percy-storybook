import createDebug from 'debug';

const debug = createDebug('react-percy:api');

export default function finalizeBuild(percyClient, build) {
  debug('finalizing build');
  return new Promise((resolve, reject) => {
    percyClient.finalizeBuild(build.id).then(
      () => {
        debug('finalized build');
        resolve();
      },
      err => {
        debug('error finalizing build %s', err.response.body);
        reject(err.response.body);
      },
    );
  });
}
