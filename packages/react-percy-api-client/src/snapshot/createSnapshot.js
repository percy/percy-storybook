export default function createSnapshot(percyClient, build, resources, options) {
    return new Promise((resolve, reject) => {
        percyClient.createSnapshot(build.id, resources, options)
        .then(
            response => resolve(response.body.data),
            err => reject(err.response.body)
        );
    });
}
