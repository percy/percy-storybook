export default function createSnapshot(percyClient, build, name, resource, sizes) {
    return new Promise((resolve, reject) => {
        percyClient.createSnapshot(build.id, [resource], {
            name,
            widths: sizes.map(size => size.width)
        })
        .then(
            response => resolve(response.body.data),
            err => reject(err.response.body)
        );
    });
}
