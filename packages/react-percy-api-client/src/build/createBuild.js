export default function createBuild(percyClient, resources) {
  return new Promise((resolve, reject) => {
    percyClient.createBuild(process.env.PERCY_PROJECT || process.env.TRAVIS_REPO_SLUG, {
      resources
    })
        .then(
            response => resolve(response.body.data),
            err => reject(err.response.body)
        );
  });
}
