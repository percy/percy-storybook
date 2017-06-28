export default function uploadResource(percyClient, build, resource) {
  return new Promise((resolve, reject) => {
    percyClient.uploadResource(build.id, resource.content)
            .then(
                () => resolve(),
                err => reject(err.response.body)
            );
  });
}
